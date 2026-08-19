/**
 * ────────────────────────────────────────────────────────────────────────────
 * CONFIGURACIÓN DE TIENDA
 *
 * Este bloque es lo único que hay que tocar para levantar el portal sobre otra
 * tienda de Shopify. Todo lo de abajo (y el resto de la app) se deriva de acá:
 * si algo específico de una tienda aparece hardcodeado en un componente, es un
 * bug de plantilla y su lugar es este archivo.
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * Mercado por defecto de la tienda.
 *
 * Va como `@inContext(country:)` en todas las queries: define qué precios,
 * moneda y disponibilidad devuelve Shopify. Tiene que coincidir con un market
 * publicado en la tienda — apuntar a uno inexistente hace que Shopify caiga en
 * silencio al mercado primario y los precios dejen de ser los que se esperan.
 *
 * Heredado del fork venía 'ES'/'EUR' fijo en los tres idiomas, con la tienda
 * argentina pidiendo precios del mercado España.
 */
export const STORE_COUNTRY = 'AR';

/**
 * Moneda de respaldo, solo para formatear importes que todavía no trajeron su
 * `currencyCode` de Shopify (totales de un presupuesto vacío, por ejemplo).
 * El precio de un producto SIEMPRE usa la moneda que vino en el dato.
 */
export const STORE_CURRENCY = 'ARS';

/**
 * Idiomas del storefront. El primero es el que se sirve sin prefijo de ruta.
 * Cada código necesita su JSON en `app/i18n/translations/`.
 */
export const STORE_LANGUAGES = ['ES', 'EN', 'FR'];

/**
 * ────────────────────────────────────────────────────────────────────────────
 * PORTAL CERRADO
 *
 * Este storefront muestra **solo el mercado B2B**: no hay navegación anónima ni
 * compra directa. Las dos constantes de abajo son el interruptor de esa
 * decisión y las lee un único lugar (`app/lib/access.server.js`), que corre en
 * `server.js` **antes** que cualquier loader. El gate está ahí y no en cada
 * ruta a propósito: una ruta nueva nace cerrada, y olvidarse de protegerla no
 * es posible. Abrir algo exige agregarlo a la allowlist a mano.
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * ¿Hace falta sesión para ver cualquier cosa?
 *
 * En `true` todo el sitio redirige a `/ingresar` salvo el propio flujo de
 * login. Consecuencia deliberada: **el catálogo deja de ser indexable**. Por
 * eso `robots.txt` pasa a `Disallow: /` mientras esto esté encendido — un
 * sitio que manda a Google a un login no gana nada publicando un sitemap.
 */
export const REQUIRE_LOGIN = true;

/**
 * ¿Además de sesión hace falta ser contacto de una company B2B de Shopify?
 *
 * En `true` un cliente logueado que no es contacto de ninguna company va a
 * `/cuenta-en-revision` y no ve catálogo ni precios. Es lo que hace que el
 * portal muestre el mercado B2B **y nada más**: sin company no hay catálogo de
 * company location que mostrar, así que mostrar el mercado por defecto sería
 * mostrar precios que no son los de ese comprador.
 *
 * ⚠️ **Esta constante puede dejar el sitio inaccesible para todos.** Si la
 * tienda no tiene companies cargadas en Shopify, no hay cuenta que pase el
 * gate — ni la de la demo. `npm run doctor` chequea exactamente eso y grita
 * si la combinación es imposible; corrélo después de apuntar el `.env` a una
 * tienda nueva y antes de dar por buena esta configuración.
 *
 * **Apagada a propósito hoy, y esto es el corazón de la chapuza:** Picafili no
 * tiene una sola company cargada, así que en `true` el portal queda cerrado
 * para todo el mundo. La aprobación pasó a ser `REQUIRE_CUSTOMER_TAGS` (acá
 * abajo). Es un reemplazo **de la puerta, no del precio**: la company sigue
 * siendo lo único que le da a Shopify de dónde sacar un precio mayorista.
 * Cuando existan companies, esto vuelve a `true` y la lista de tags se vacía.
 */
export const REQUIRE_B2B_COMPANY = false;

/**
 * Tags de cliente que hacen falta para entrar al portal — **todos**, no
 * alguno.
 *
 * ⚠️ **Esto es una chapuza deliberada, y conviene saber exactamente qué es y
 * qué no es.**
 *
 * Es una **puerta**, no un precio. Shopify no sabe darle un catálogo B2B a un
 * cliente por su tag: los catálogos cuelgan de la **company location** (en
 * planes no-Plus, vía el B2B market; en Plus, directo a la location). Un
 * cliente con `mayorista-aprobado` y sin company sigue sin tener de dónde
 * sacar un precio mayorista — ver `resolveBuyer` en `b2b.server.js`, y
 * `docs/puesta-en-marcha.md` §4.2.
 *
 * Existe porque el alta mayorista de esta tienda hoy termina en tags y no en
 * una company: la aprobación la hace una persona en el admin poniendo el tag,
 * que es un click, contra crear company + location + meterla en el market. El
 * costo de esa comodidad es que la aprobación **no trae el precio con ella**.
 *
 * Lo que la reemplaza cuando existan companies cargadas: `REQUIRE_B2B_COMPANY`
 * con esta lista vacía. Las dos son ANDs, así que mientras las dos estén
 * encendidas hay que cumplir las dos, y una tienda sin companies deja afuera
 * hasta al que tiene los dos tags.
 *
 * Comparación sin distinguir mayúsculas ni espacios sobrantes: Shopify
 * conserva cómo se escribió el tag pero deduplica sin mirar el caso, así que
 * `Mayorista` y `mayorista` son el mismo tag y el gate no puede opinar
 * distinto que el admin. Lista vacía = chequeo apagado.
 */
export const REQUIRE_CUSTOMER_TAGS = ['mayorista', 'mayorista-aprobado'];

/**
 * ¿El portal junta el alta mayorista con su propio formulario?
 *
 * **Apagado en Picafili**, porque el alta la junta **Shopify Forms** en
 * `picafili.com.ar` y ese formulario ya crea la company. Encendido, la sala de
 * espera le pide razón social, CUIT y dirección a alguien que acaba de darlos:
 * pedir dos veces el mismo dato no es un detalle de UX, es la señal de que hay
 * dos altas distintas y nadie sabe cuál manda.
 *
 * Se sigue mostrando la pantalla de estado —qué falta y a quién escribirle—,
 * que es lo único útil mientras la aprobación no llega.
 *
 * En `true` vuelve el formulario, que es lo que necesita una tienda **sin**
 * Forms: ahí el portal es el único lugar donde el comprador puede dejar sus
 * datos. Aun encendido, a quien ya tiene company no se le pide nada: el alta
 * ya ocurrió, venga de donde venga.
 */
export const B2B_REQUEST_FORM_ENABLED = false;

/**
 * Carrito y checkout de Shopify.
 *
 * **Decisión revisada otra vez, y esta vez hacia el lado nativo.** El portal
 * nació con la única salida "presupuesto → draft order por Admin API", para que
 * todo pedido pasara por revisión comercial. Resulta que **B2B ya hace eso
 * solo**: con `checkoutToDraft` encendido en la company location, el comprador
 * completa el checkout y el pedido entra como **borrador para revisión**. La
 * revisión no se pierde; la hace Shopify.
 *
 * Lo que se gana no es solo ahorrarse una app: el `ADMIN_API_ACCESS_TOKEN` sale
 * del camino crítico. Pedir deja de depender de una credencial nuestra que, si
 * falta o vence, tira el sitio entero.
 *
 * Y los precios los liquida quien los define: el catálogo de la company
 * location. Ver `ENABLE_QUOTE` acá abajo.
 */
export const ENABLE_CART = true;

/**
 * Flujo propio de presupuesto (nota de pedido → draft order por Admin API).
 *
 * En `false` desaparecen el drawer de presupuesto, la barra inferior, la
 * pantalla `/presupuesto` y el endpoint que emite el draft order; las tarjetas
 * y la ficha pasan a agregar **al carrito**.
 *
 * Sigue existiendo el código porque es la única forma de cotizar en una tienda
 * **sin** B2B —sin company no hay catálogo, y sin catálogo un carrito muestra
 * precios de retail—, que es el caso de cualquier tienda donde esta plantilla
 * se instale antes de tener companies cargadas. Los dos flujos nunca conviven
 * encendidos: dos formas de pedir es dos formas de que el total no coincida.
 */
export const ENABLE_QUOTE = false;

/**
 * ────────────────────────────────────────────────────────────────────────────
 * DESCUENTOS
 *
 * Cuántos hay, cómo se llaman, quién los edita y cómo se acumulan **cambia por
 * negocio**. Un cliente tiene un descuento; otro tiene dos de acuerdo más uno
 * de cierre; otro trabaja por categoría. Todo eso se configura acá y el resto
 * de la app se adapta: la pantalla de presupuesto dibuja un input por cada
 * slot editable, y el cálculo recorre la lista.
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * Los descuentos que maneja la tienda, en orden de lectura.
 *
 * - `id`        identificador estable. Viaja en la cookie del presupuesto.
 * - `labelKey`  clave de i18n. **Nunca un texto acá**: lo ve el cliente.
 * - `source`    de dónde sale el número:
 *     · `customer`  del acuerdo comercial (hoy sin fuente de datos en Shopify)
 *     · `category`  de la categoría del producto (idem)
 *     · `quote`     se carga en el presupuesto
 * - `editableBy` qué rol puede editarlo desde la pantalla de presupuesto.
 *     Ausente = nadie lo edita a mano.
 *
 * Sacar un slot de esta lista lo saca de la UI, del cálculo y del pedido.
 *
 * **Vacío por decisión de negocio (2026-08-19): Picafili trabaja con precios de
 * catálogo y nada más.** El descuento del mayorista ES el catálogo "Precios
 * Mayoristas" de su company location, así que no hay porcentaje que aplicarle
 * encima. Además, con el checkout de Shopify liquidando el pedido, un
 * porcentaje calculado por el storefront no tendría dónde aplicarse: lo que se
 * cobra sale del catálogo, y un total mostrado que no coincida con el cobrado
 * es peor que no mostrar ninguno.
 *
 * La maquinaria queda porque otra tienda sí puede necesitarla —acuerdos por
 * cliente encima de la lista— y encenderla es agregar slots acá.
 */
export const DISCOUNT_SLOTS = [];

export const CATEGORY_DISCOUNTS_ENABLED = false;

/**
 * De dónde sale la "categoría" de un producto.
 *
 * **No hay una respuesta universal y la plantilla no puede tener favorita.** En
 * la tienda de demo `productType` viene vacío en todos los productos, así que
 * asumirlo habría dejado los descuentos por categoría sin enganche y sin error
 * visible. Otra tienda lo usa y le alcanza.
 *
 * - `productType`  el tipo de producto de Shopify
 * - `collection`   el handle de la primera colección del producto
 *
 * ⚠️ Con `collection` hace falta además una **regla de desempate**: un producto
 * puede estar en varias colecciones y más de una puede tener descuento. Cuál
 * gana —el mayor, el menor, se encadenan— es decisión del negocio y cambia lo
 * que se cobra. Hoy se toma la primera, que es un default, no una decisión.
 */
export const CATEGORY_KEY_SOURCE = 'collection';

/**
 * Tope del descuento por slot, en %.
 *
 * Existe porque un descuento sin techo es una vía para regalar el catálogo por
 * error de tipeo: un 90 donde iba un 9. El tope real lo define el negocio
 * (suele ser por vendedor o por lista); esto es el piso de seguridad.
 */
export const MAX_LINE_DISCOUNT = 30;

/**
 * Cómo se acumulan los descuentos de una línea.
 *
 * ⚠️ **Decisión de negocio, no de implementación.** Cambia lo que se cobra:
 * dos descuentos del 10% dan **19% en cascada** y **20% sumados**.
 *
 * - `cascade`  cada descuento se aplica sobre el saldo del anterior. Es lo
 *              habitual en mayorista y es el valor por defecto.
 * - `additive` se suman los porcentajes.
 */
export const DISCOUNT_STACK_MODE = 'cascade';

/**
 * Switcher "Ver como" de la barra mayorista: herramienta de demo para mostrar
 * los cuatro estados de cuenta sin companies reales cargadas en Shopify.
 *
 * **Apagado desde que el portal exige company real** (`REQUIRE_B2B_COMPANY`).
 * No es solo que sobre: el switcher escribe la cookie `demoAccountState`, y
 * `canSeePricesOnServer` la aceptaba como prueba de que el visitante puede ver
 * precios. Eso convertía "poné una cookie a mano" en la llave de la lista de
 * precios completa. Con el gate real esa cookie ya no gobierna nada.
 */
export const DEMO_ROLE_SWITCHER = false;

/**
 * Pedido mínimo de la nota de pedido, expresado en `STORE_CURRENCY`.
 *
 * Es el piso **por defecto de la tienda**: se usa cuando la company location
 * no tiene el suyo cargado (ver `MINIMUM_ORDER_METAFIELD`). Poner en 0 o null
 * lo desactiva por completo.
 *
 * ⚠️ El valor de acá sigue siendo el de la demo. El piso real de Picafili es
 * decisión del negocio, y ahora se puede cargar por cliente sin tocar código.
 *
 * Modo AVISO: se muestra cuánto falta pero no bloquea el envío.
 */
export const MINIMUM_ORDER_AMOUNT = 150000;

/**
 * De dónde sale el mínimo de CADA cliente.
 *
 * Un metafield de la **company location**, porque el mínimo es una condición
 * comercial y en mayorista rara vez es una sola para todos: el que compra por
 * pallet y el kiosco de la esquina no tienen el mismo piso. Vive en la
 * ubicación y no en el código para que lo edite quien negocia, en el admin,
 * sin esperar un deploy.
 *
 * Se lee en la misma query que ya trae la company —`CompanyLocation` acepta
 * metafields en la Customer Account API—, así que no cuesta una llamada más.
 * Cuando la ubicación no lo tiene cargado, manda `MINIMUM_ORDER_AMOUNT` como
 * piso general de la tienda.
 *
 * La definición se crea con `npm run setup:b2b`; sin ella el valor se guarda
 * igual y el admin no lo muestra — el mismo problema que los metafields de la
 * solicitud.
 */
export const MINIMUM_ORDER_METAFIELD = {
  namespace: 'b2b',
  key: 'pedido_minimo',
};

/**
 * Alícuota para discriminar el impuesto en el resumen del presupuesto.
 *
 * ⚠️ **Apagado a propósito (`null`).** Discriminar IVA exige saber algo que hoy
 * nadie confirmó: si los precios que devuelve Shopify **ya lo incluyen** o no.
 * Si vienen con IVA incluido y le sumamos 21% encima, el total del presupuesto
 * queda 21% por arriba de lo que después factura Shopify — el peor error
 * posible en un pedido mayorista.
 *
 * Cuando el negocio lo confirme:
 *   - precios SIN impuesto → poner `0.21`: se suma sobre el subtotal.
 *   - precios CON impuesto → hay que desglosar hacia atrás, no sumar; ver
 *     `getQuoteTotals` antes de tocar esto.
 *
 * Shopify sigue siendo la autoridad: esto es una estimación de pantalla.
 */
export const ESTIMATED_TAX_RATE = null;

/**
 * Modelo de "producto padre / hijo", heredado del fork.
 *
 * La tienda de iluminación del fork partía cada artículo en un producto
 * **padre** (el que se navega) y varios **hijos** (cada combinación de acabado
 * y potencia, que no debían aparecer sueltos en el listado). Los marcaba con el
 * metafield `product.grouped = true` y con el tag `parent`, y el storefront
 * filtraba por eso en **dos lugares distintos y hardcodeados**: el loader de
 * colección y la query de búsqueda.
 *
 * ⚠️ **Eso rompía este proyecto en silencio.** Ningún producto de Picafili tiene
 * el tag `parent` —verificado: 0 de 44— así que la búsqueda del sitio devolvía
 * **cero resultados para cualquier término**, siempre. La misma búsqueda sin el
 * tag devuelve 15 para "babero". El filtro por metafield no llegó a hacer daño
 * de casualidad: Shopify ignora un filtro sobre un metafield que la tienda no
 * define, así que era un no-op — pero en una tienda que sí lo tenga definido
 * escondería productos sin avisar.
 *
 * Por eso ahora es configuración y viene **apagado**: una tienda de Shopify
 * normal no tiene padres ni hijos, tiene productos con variantes. Una tienda que
 * sí use ese modelo lo enciende acá y no toca ninguna ruta:
 *
 *     export const PARENT_PRODUCT_FILTER = {
 *       metafield: {namespace: 'product', key: 'grouped', value: 'true'},
 *       searchTag: 'parent',
 *     };
 *
 * Cualquiera de las dos claves puede faltar: se aplica solo la que esté.
 *
 * @type {{metafield?: {namespace: string, key: string, value: string}, searchTag?: string} | null}
 */
export const PARENT_PRODUCT_FILTER = null;

/**
 * Contacto del equipo comercial.
 *
 * Es el dato que más se busca en el pie de un sitio mayorista, y hoy no está en
 * ninguna parte del storefront: un comprador con una duda de stock o de plazo
 * tiene que salir a buscar el teléfono afuera.
 *
 * Vive acá y no en un componente porque cambia en cada tienda. **Cada campo es
 * opcional**: el que esté en `null` no se renderiza, así que una tienda que no
 * tiene WhatsApp no muestra una fila vacía. El día que el negocio quiera que lo
 * edite el merchant sin tocar código, esto pasa a un metaobject de Shopify y el
 * componente no cambia.
 *
 * `phone` va en formato internacional para que `tel:` y `wa.me` funcionen desde
 * el teléfono; `phoneLabel` es cómo se muestra.
 */
export const SALES_CONTACT = {
  // ⚠️ Teléfono, WhatsApp y horario están en null porque NO los tenemos: son
  // dato del negocio y no se inventan. El pie ya los muestra apenas se carguen.
  phone: null,
  phoneLabel: null,
  whatsapp: null,
  // El único que teníamos: estaba hardcodeado dentro de Footer.jsx.
  email: 'hola@picafili.com.ar',
  /** Clave de i18n, no texto: el horario se dice distinto en cada idioma. */
  hoursKey: null,
};

/**
 * Condiciones comerciales que el comprador mayorista pregunta ANTES de cerrar
 * un pedido, y que hoy obligan a llamar por teléfono.
 *
 * Son claves de i18n y no textos: el pie es de las pocas partes del sitio que
 * se lee entera, y en tres idiomas. El monto mínimo no está acá porque ya vive
 * en `MINIMUM_ORDER_AMOUNT` — repetirlo sería tener dos fuentes de verdad para
 * el mismo número.
 *
 * Poner `null` en cualquiera lo saca del pie.
 */
export const COMMERCIAL_TERMS = {
  showMinimumOrder: true,
  // ⚠️ En null a propósito. Plazos, zonas y medios de pago son compromisos
  // comerciales: un "entrega en 48hs" inventado para que la demo se vea llena
  // se convierte en una promesa en cuanto alguien la muestra. Encenderlos es
  // poner la clave acá y el texto en app/i18n/translations/*.json.
  deliveryKey: null,
  shippingAreasKey: null,
  paymentKey: null,
};

/** Cuántas categorías y productos muestra la home. Ajustable por tienda. */
export const HOME_CATEGORIES_COUNT = 8;
export const HOME_PRODUCTS_COUNT = 8;

export const PAGINATION_SIZE = 8;
export const DEFAULT_GRID_IMG_LOAD_EAGER_COUNT = 4;
export const ATTR_LOADING_EAGER = 'eager';

/**
 * @param {number} index
 */
export function getImageLoadingPriority(
  index,
  maxEagerLoadCount = DEFAULT_GRID_IMG_LOAD_EAGER_COUNT,
) {
  return index < maxEagerLoadCount ? ATTR_LOADING_EAGER : undefined;
}
