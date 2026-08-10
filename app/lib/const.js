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
 */
export const REQUIRE_B2B_COMPANY = true;

/**
 * Carrito de compra directa.
 *
 * **Decisión revisada: la única salida es el presupuesto → draft order.**
 * Antes convivían dos caminos —presupuesto para lo que se negocia, carrito con
 * checkout de Shopify para lo que ya tenía precio cerrado— con el presupuesto
 * como acción primaria. En un portal donde el precio sale del catálogo de la
 * company y todo pedido lo revisa el equipo comercial, el checkout directo no
 * es un atajo: es una segunda forma de comprar que se saltea la revisión.
 *
 * En `false` no se renderiza ni el ícono ni el drawer ni las acciones de
 * carrito, **y las rutas `/cart` y `/api/cart/*` quedan cerradas**. Lo segundo
 * importa tanto como lo primero: esconder el botón deja el checkout a un
 * pegado de URL de distancia, y `checkoutUrl` viaja en el payload del carrito.
 */
export const ENABLE_CART = false;

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
 */
export const DISCOUNT_SLOTS = [
  {id: 'discount-1', labelKey: 'discounts.discount-1', source: 'customer'},
  {id: 'discount-2', labelKey: 'discounts.discount-2', source: 'customer'},
  {
    id: 'discount-3',
    labelKey: 'discounts.discount-3',
    source: 'quote',
    editableBy: 'sales_rep',
  },
];

/** ¿La tienda aplica descuentos por categoría de producto? */
export const CATEGORY_DISCOUNTS_ENABLED = true;

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
 * ⚠️ Valor PROVISORIO para la demo. El monto real y si es global o por cuenta
 * son decisión del negocio (E13 del backlog). Poner en 0 o null lo desactiva.
 *
 * Modo AVISO: se muestra cuánto falta pero no bloquea el envío.
 */
export const MINIMUM_ORDER_AMOUNT = 150000;

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
