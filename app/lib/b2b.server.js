import {CUSTOMER_COMPANY_QUERY} from '~/graphql/customer-account/CustomerCompanyQuery.js';

/**
 * Contexto B2B del cliente logueado: company, locations y **buyer context**.
 *
 * Devuelve `null` en todos los caminos donde no hay nada que mostrar —
 * visitante anónimo, tienda sin B2B habilitado, cliente que no es contacto de
 * ninguna company— para que la UI no tenga que distinguir entre "todavía no
 * cargó", "falló" y "no aplica". Nunca lanza: si B2B está apagado la query
 * devuelve errores y eso NO puede tumbar el storefront entero.
 *
 * @param {import('@shopify/remix-oxygen').AppLoadContext} context
 */
export async function getB2BContext(context) {
  const {customerAccount} = context;

  try {
    const loggedIn = await customerAccount.isLoggedIn();
    if (!loggedIn) return null;

    const {data, errors} = await customerAccount.query(CUSTOMER_COMPANY_QUERY);

    if (errors?.length) return null;

    const company =
      data?.customer?.companyContacts?.edges?.[0]?.node?.company ?? null;

    if (!company) return null;

    const locations = (company.locations?.edges ?? [])
      .map((edge) => edge?.node)
      .filter(Boolean);

    // ⚠️ Con varias locations se toma la PRIMERA, y eso es un default, no una
    // decisión: cada company location puede tener su catálogo y su lista de
    // precios, así que elegir mal es mostrar precios de otra sucursal. Hoy no
    // hay selector de location en el portal; el día que haya, el elegido se
    // guarda con `setBuyer` y esta línea pasa a ser solo el valor inicial.
    const activeLocationId = locations[0]?.id ?? null;

    if (activeLocationId) {
      // Persiste la location en la sesión. Hydrogen la mezcla con lo que ya
      // hay guardado (no pisa el token), y es de ahí de donde sale el buyer
      // que viaja en las queries de catálogo.
      customerAccount.UNSTABLE_setBuyer({companyLocationId: activeLocationId});
    }

    return {
      companyId: company.id,
      companyName: company.name,
      locations,
      activeLocationId,
      buyer: await resolveBuyer(customerAccount, activeLocationId),
    };
  } catch (error) {
    // B2B apagado, permisos faltantes o API caída: la tienda sigue andando.
    return null;
  }
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

  if (!buyer?.customerAccessToken) return null;

  return {
    companyLocationId,
    customerAccessToken: buyer.customerAccessToken,
  };
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
