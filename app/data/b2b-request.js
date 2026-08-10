/**
 * Los campos de la solicitud de acceso mayorista — **la lista canónica**.
 *
 * Mismo criterio que `app/data/metafields.js`: los identifiers viven en un solo
 * lugar y nadie los escribe sueltos dentro de una query o un componente. De acá
 * salen el formulario, la validación, lo que se escribe en Shopify y lo que se
 * lee para saber si alguien ya pidió acceso.
 *
 * ⚠️ **Estas definiciones tienen que existir en el admin de Shopify**
 * (Configuración → Datos personalizados → Clientes), con este namespace y estas
 * keys. `metafieldsSet` acepta escribir un metafield sin definición y devuelve
 * éxito, pero **el admin no lo muestra** — y el backoffice de esto es el admin.
 * O sea: la solicitud se guardaría bien y quien tiene que aprobarla no vería
 * nada, sin un solo error en el camino. `npm run doctor` lo chequea.
 *
 * `zone` y `country` no están: el país sale de `STORE_COUNTRY` y la provincia se
 * carga como texto porque el comprador no tiene por qué conocer el código ISO.
 */

/** Namespace de los metafields de cliente que escribe el portal. */
export const B2B_REQUEST_NAMESPACE = 'b2b';

/**
 * Un campo del formulario.
 *
 * - `name`      nombre del input y clave en el FormData
 * - `key`       key del metafield en Shopify (snake_case, su convención)
 * - `labelKey`  clave de i18n. **Nunca un texto acá**: lo ve el cliente
 * - `required`  si falta, la solicitud no se envía
 * - `autoComplete` para que el navegador ofrezca lo que ya sabe
 * - `validate`  nombre de la regla extra en `~/lib/b2b-request.js`
 */
export const B2B_REQUEST_FIELDS = [
  {
    name: 'razonSocial',
    key: 'razon_social',
    labelKey: 'b2b-request.razon-social',
    required: true,
    autoComplete: 'organization',
    minLength: 2,
  },
  {
    name: 'cuit',
    key: 'cuit',
    labelKey: 'b2b-request.cuit',
    required: true,
    autoComplete: 'off',
    validate: 'cuit',
  },
  {
    name: 'contacto',
    key: 'contacto',
    labelKey: 'b2b-request.contacto',
    required: true,
    autoComplete: 'name',
    minLength: 2,
  },
  {
    name: 'telefono',
    key: 'telefono',
    labelKey: 'b2b-request.telefono',
    required: true,
    autoComplete: 'tel',
    minLength: 6,
  },
  {
    name: 'direccion',
    key: 'direccion',
    labelKey: 'b2b-request.direccion',
    required: true,
    autoComplete: 'street-address',
    minLength: 4,
  },
  {
    name: 'localidad',
    key: 'localidad',
    labelKey: 'b2b-request.localidad',
    required: true,
    autoComplete: 'address-level2',
    minLength: 2,
  },
  {
    name: 'provincia',
    key: 'provincia',
    labelKey: 'b2b-request.provincia',
    required: true,
    autoComplete: 'address-level1',
    minLength: 2,
  },
  {
    name: 'codigoPostal',
    key: 'codigo_postal',
    labelKey: 'b2b-request.codigo-postal',
    required: true,
    autoComplete: 'postal-code',
    minLength: 4,
  },
];

/**
 * Cuándo se pidió. No lo carga el comprador: lo pone el servidor.
 *
 * Existe para que quien aprueba sepa cuánto lleva esperando alguien — el dato
 * que convierte "hay solicitudes" en "esta lleva nueve días".
 */
export const B2B_REQUESTED_AT_KEY = 'solicitado_en';

/** Tag que marca al cliente como solicitante. Es lo que se filtra en el admin. */
export const B2B_REQUEST_TAG = 'b2b:solicitado';

/** Todas las keys que el portal escribe y lee, para la query y para el doctor. */
export const B2B_REQUEST_KEYS = [
  ...B2B_REQUEST_FIELDS.map((field) => field.key),
  B2B_REQUESTED_AT_KEY,
];
