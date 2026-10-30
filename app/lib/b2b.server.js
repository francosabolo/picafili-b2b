import {
  CUSTOMER_COMPANY_QUERY,
  customerCompanyVariables,
} from '~/graphql/customer-account/CustomerCompanyQuery.js';
import {MINIMUM_ORDER_METAFIELD} from '~/lib/const.js';
import {
  RETAIL_SAMPLE_QUERY,
  WHOLESALE_SAMPLE_QUERY,
} from '~/graphql/products/wholesaleCheck.js';

/**
 * Todo lo que el portal necesita saber del cliente logueado, de una sola
 * query: sus **tags** y su contexto **B2B** (company, locations y buyer).
 *
 * Son dos cosas distintas y conviene no mezclarlas: los tags son la *puerta*
 * (quién entra — ver `app/lib/customer-tags.js`) y el contexto B2B es el
 * *precio* (de qué catálogo sale cada importe). Hoy la tienda tiene lo primero
 * y no lo segundo, así que se resuelven por separado aunque viajen juntas.
 *
 * `b2b` es `null` en todos los caminos donde no hay nada que mostrar —
 * visitante anónimo, tienda sin B2B habilitado, cliente que no es contacto de
 * ninguna company— para que la UI no tenga que distinguir entre "todavía no
 * cargó", "falló" y "no aplica". Nunca lanza: si B2B está apagado la query
 * devuelve errores y eso NO puede tumbar el storefront entero.
 *
 * **Falla cerrado.** Ante cualquier problema devuelve `tags: []`, que para el
 * gate significa "no entra". Es la dirección correcta del error: un fallo de
 * red no puede convertirse en un portal abierto.
 *
 * @param {import('@shopify/remix-oxygen').AppLoadContext} context
 * @returns {Promise<{tags: string[], email: string|null, b2b: object|null}>}
 */
export async function getCustomerContext(context) {
  const {customerAccount} = context;
  const empty = {tags: [], email: null, b2b: null};

  try {
    const loggedIn = await customerAccount.isLoggedIn();
    if (!loggedIn) return empty;

    const {data, errors} = await customerAccount.query(CUSTOMER_COMPANY_QUERY, {
      variables: customerCompanyVariables(),
    });

    if (errors?.length) return empty;

    const tags = data?.customer?.tags ?? [];

    // El email de la sesión. Es el que manda para emitir el presupuesto: el
    // que viajaba en el formulario lo escribía el navegador, así que no era
    // dato de identidad sino un campo de texto.
    const email = data?.customer?.emailAddress?.emailAddress ?? null;

    const contact = data?.customer?.companyContacts?.edges?.[0]?.node ?? null;
    const company = contact?.company ?? null;

    if (!company) return {tags, email, b2b: null};

    // Primero las ubicaciones DEL CONTACTO —las que esta persona puede
    // usar— y recién después las de la empresa. La distinción no es teórica:
    // un contacto sin rol asignado ve la empresa y ninguna ubicación, que es
    // el estado en el que el portal deja entrar y no muestra un solo precio.
    const locations = (
      contact?.locations?.edges?.length
        ? contact.locations.edges
        : company.locations?.edges ?? []
    )
      .map((edge) => edge?.node)
      .filter(Boolean);

    if (!locations.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `[b2b] "${company.name}" no expone ninguna company location para este contacto: sin ubicación no hay buyer context y el portal no puede mostrar precios. Suele ser un contacto sin rol asignado en la ubicación (Clientes → Empresas → ubicación → roles).`,
      );
    }

    // ⚠️ Con varias locations se toma la PRIMERA, y eso es un default, no una
    // decisión: cada company location puede tener su catálogo y su lista de
    // precios, así que elegir mal es mostrar precios de otra sucursal. Hoy no
    // hay selector de location en el portal; el día que haya, el elegido se
    // guarda con `setBuyer` y esta línea pasa a ser solo el valor inicial.
    const activeLocationId = locations[0]?.id ?? null;

    // El pedido mínimo de ESTA ubicación, si lo tiene cargado. Es dato del
    // acuerdo con ese cliente, no del código.
    const minimumOrderAmount = readMinimumOrder(
      locations.find((location) => location.id === activeLocationId),
    );

    if (activeLocationId) {
      // Persiste la location en la sesión. Hydrogen la mezcla con lo que ya
      // hay guardado (no pisa el token), y es de ahí de donde sale el buyer
      // que viaja en las queries de catálogo.
      customerAccount.UNSTABLE_setBuyer({companyLocationId: activeLocationId});
    }

    return {
      tags,
      email,
      b2b: {
        companyId: company.id,
        companyName: company.name,
        locations,
        activeLocationId,
        minimumOrderAmount,
        buyer: await checkWholesalePricing(
          context.storefront,
          await resolveBuyer(customerAccount, activeLocationId),
          company.name,
        ),
      },
    };
  } catch (error) {
    // B2B apagado, permisos faltantes o API caída: la tienda sigue andando.
    return empty;
  }
}

/**
 * El pedido mínimo cargado en la company location, en número.
 *
 * `null` si no está cargado o si lo que hay no es un número — ahí manda el
 * piso general de la tienda (`MINIMUM_ORDER_AMOUNT`). Un metafield es texto
 * libre: alguien puede escribir "150.000" o dejarlo vacío, y un mínimo que
 * termina en `NaN` haría desaparecer el aviso sin explicación.
 *
 * @param {{metafields?: Array<{key: string, value: string}|null>}|undefined} location
 * @returns {number|null}
 */
function readMinimumOrder(location) {
  const raw = (location?.metafields ?? []).find(
    (metafield) => metafield?.key === MINIMUM_ORDER_METAFIELD.key,
  )?.value;

  if (!raw) return null;

  // Se aceptan "150000", "150000.00" y "150.000" — el separador de miles es lo
  // que cualquiera escribe sin pensar.
  const normalized = String(raw)
    .trim()
    .replace(/\.(?=\d{3}\b)/g, '');
  const amount = Number(normalized.replace(',', '.'));

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/**
 * El buyer que la Storefront API espera en `@inContext(buyer:)`.
 *
 * Necesita **las dos** partes: la company location y un token de storefront
 * del cliente. La location la sabemos siempre; el token lo emite Hydrogen con
 * `storefrontCustomerAccessTokenCreate`, y —esto es lo que hay que saber— solo
 * lo hace **al autorizar el login y al refrescar el token**, no en cada
 * request. Una sesión abierta desde antes de que `unstableB2b` estuviera
 * encendido no lo tiene hasta que refresque (a lo sumo un par de horas) o
 * hasta que la persona vuelva a entrar.
 *
 * Por eso devuelve `null` en vez de un buyer a medias: mandar la location sin
 * token no scopea nada, y Shopify contestaría con los precios del mercado por
 * defecto **sin avisar**. Precios que no son los de este comprador, con cara
 * de precios correctos, es el peor resultado posible — peor que no mostrarlos.
 * `canSeePricesOnServer` se apoya en esto: sin buyer completo, no hay precios.
 *
 * @param {import('@shopify/hydrogen').CustomerAccount} customerAccount
 * @param {string|null} companyLocationId
 */
async function resolveBuyer(customerAccount, companyLocationId) {
  if (!companyLocationId) return null;

  const buyer = await customerAccount.UNSTABLE_getBuyer();

  if (!buyer?.customerAccessToken) {
    // Sin esto el síntoma es mudo: hay company, la UI dice "no podés pedir" y
    // no hay nada en ningún lado que explique por qué. El token lo emite
    // Hydrogen en `authorize()` y al refrescar; una sesión abierta desde antes
    // de que `unstableB2b` estuviera encendido no lo tiene, y tampoco lo tiene
    // si esa mutation falló en silencio. Queda en los logs de Oxygen.
    // eslint-disable-next-line no-console
    console.warn(
      '[b2b] company location resuelta pero SIN customerAccessToken de storefront: no se puede pedir el precio de esa company. La sesión tiene que volver a autorizar (logout + login).',
    );

    return null;
  }

  return {
    companyLocationId,
    customerAccessToken: buyer.customerAccessToken,
  };
}

/**
 * Devuelve el buyer solo si Shopify le está dando precio mayorista.
 *
 * Un buyer completo (location + token) no garantiza nada: si la company
 * location no está en un mercado con catálogo, Shopify contesta con el precio
 * de lista **sin avisar**, y el portal lo mostraba como si fuera el mayorista.
 * Pasó en Picafili: 33 de 39 locations estaban fuera del mercado B2B, porque
 * aprobar una cuenta crea la company pero no la suma al mercado.
 *
 * La prueba es empírica: una muestra de precios con buyer contra la misma sin
 * buyer. Si ninguno baja, ese buyer no tiene catálogo y se devuelve `null`, que
 * para `canSeePricesOnServer` es "no se muestran precios" — el mismo camino que
 * una sesión sin token.
 *
 * Ante un error de red se queda con el buyer: un fallo pasajero no puede
 * esconderle los precios a todos los mayoristas. Un catálogo que sube precios
 * o los deja iguales en toda la muestra se leería como "sin catálogo"; con un
 * catálogo por porcentaje de descuento eso no pasa.
 *
 * @param {import('@shopify/hydrogen').Storefront} storefront
 * @param {{companyLocationId: string, customerAccessToken: string}|null} buyer
 * @param {string} companyName
 */
async function checkWholesalePricing(storefront, buyer, companyName) {
  if (!buyer || !storefront) return buyer;

  try {
    const [withBuyer, retail] = await Promise.all([
      storefront.query(WHOLESALE_SAMPLE_QUERY, {
        cache: storefront.CacheNone(),
        variables: {buyer},
      }),
      storefront.query(RETAIL_SAMPLE_QUERY, {cache: storefront.CacheLong()}),
    ]);

    const retailPrices = new Map(
      samplePrices(retail).map(({id, amount}) => [id, amount]),
    );
    const compared = samplePrices(withBuyer).filter(({id}) =>
      retailPrices.has(id),
    );

    // Sin nada que comparar (tienda vacía, muestra rara) no hay evidencia
    // para sacarle los precios a nadie.
    if (!compared.length) return buyer;

    const discounted = compared.some(
      ({id, amount}) => amount < retailPrices.get(id),
    );
    if (discounted) return buyer;

    // eslint-disable-next-line no-console
    console.warn(
      `[b2b] "${companyName}" (${buyer.companyLocationId}) recibe precios de lista: la company location no está en ningún mercado con catálogo B2B. Se ocultan los precios. Sumala al mercado B2B en Shopify (Configuración → Mercados).`,
    );
    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[b2b] checkWholesalePricing:', error);
    return buyer;
  }
}

/**
 * Los precios de la muestra como `{id, amount}`, solo los mayores a cero.
 *
 * @param {any} data
 * @returns {Array<{id: string, amount: number}>}
 */
function samplePrices(data) {
  return (data?.products?.nodes ?? [])
    .map((product) => product?.variants?.nodes?.[0])
    .filter(Boolean)
    .map((variant) => ({
      id: variant.id,
      amount: Number(variant.price?.amount),
    }))
    .filter(({amount}) => Number.isFinite(amount) && amount > 0);
}

/**
 * Las variables de buyer para una query de catálogo.
 *
 * Se spreadea en `variables` de cualquier query que declare `$buyer:
 * BuyerInput`. Siempre devuelve la clave —con `null` cuando no hay contexto—
 * para que haya un solo camino: una variable declarada y no enviada es un
 * error de GraphQL esperando a pasar, y `buyer: null` es válido y significa
 * exactamente "sin contexto de comprador".
 *
 * @param {import('@shopify/remix-oxygen').AppLoadContext} context
 * @returns {{buyer: {companyLocationId: string, customerAccessToken: string}|null}}
 */
export function getBuyerVariables(context) {
  return {buyer: context?.b2b?.buyer ?? null};
}
