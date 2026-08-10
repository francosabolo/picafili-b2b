import {
  B2B_REQUEST_FIELDS,
  B2B_REQUEST_NAMESPACE,
  B2B_REQUESTED_AT_KEY,
} from '~/data/b2b-request.js';

/**
 * Armado y validación de la solicitud de acceso mayorista.
 *
 * Lógica **pura**, igual que `~/lib/draft-order.js` y por la misma razón: acá
 * se puede verificar sin levantar el worker ni tener un token de Admin válido,
 * que es justo lo que no hay en local.
 */

/**
 * ¿Es un CUIT válido?
 *
 * Se valida el **dígito verificador**, no solo que sean once números. La
 * diferencia importa: el CUIT es la clave con la que después se crea la company
 * (`externalId`), así que un dígito mal tipeado no es un campo feo — es una
 * company duplicada o imposible de cruzar con la facturación. Y es la clase de
 * error que nadie detecta a ojo.
 *
 * @param {string} value
 */
export function isValidCuit(value) {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (digits.length !== 11) return false;

  // Un CUIT de once dígitos iguales pasa el verificador y no existe.
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce(
    (total, weight, index) => total + weight * Number(digits[index]),
    0,
  );

  const remainder = 11 - (sum % 11);
  const check = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder;

  return check === Number(digits[10]);
}

/** CUIT normalizado a `XX-XXXXXXXX-X`, que es como se lee y se factura. */
export function formatCuit(value) {
  const digits = String(value ?? '').replace(/\D/g, '');

  return digits.length === 11
    ? `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
    : String(value ?? '').trim();
}

const VALIDATORS = {cuit: isValidCuit};

/**
 * Valida el formulario y devuelve los metafields a escribir.
 *
 * Devuelve `{errors}` con **todos** los campos que fallaron, no el primero: un
 * formulario que corrige de a un error por envío es un formulario que se
 * abandona. Las claves de `errors` son nombres de campo y sus valores, claves
 * de i18n — el texto lo pone la UI, no el servidor.
 *
 * @param {Record<string, unknown>} body
 * @param {string} requestedAt ISO. Lo pone quien llama: acá no se lee el reloj
 *   para que la función sea determinística y verificable.
 * @returns {{metafields?: Array<object>, errors?: Record<string, string>}}
 */
export function buildB2BRequest(body, requestedAt) {
  const errors = {};
  const values = {};

  for (const field of B2B_REQUEST_FIELDS) {
    const raw = String(body?.[field.name] ?? '').trim();

    if (!raw) {
      if (field.required) errors[field.name] = 'b2b-request.error-required';
      continue;
    }

    if (field.minLength && raw.length < field.minLength) {
      errors[field.name] = 'b2b-request.error-too-short';
      continue;
    }

    const validator = field.validate ? VALIDATORS[field.validate] : null;

    if (validator && !validator(raw)) {
      errors[field.name] = `b2b-request.error-${field.validate}`;
      continue;
    }

    values[field.key] = field.validate === 'cuit' ? formatCuit(raw) : raw;
  }

  if (Object.keys(errors).length) return {errors};

  values[B2B_REQUESTED_AT_KEY] = requestedAt;

  return {
    metafields: Object.entries(values).map(([key, value]) => ({
      namespace: B2B_REQUEST_NAMESPACE,
      key,
      // `single_line_text_field` para todo, incluida la fecha: el valor se
      // muestra tal cual en el admin y un `date_time` obliga a quien aprueba a
      // leer un ISO con zona horaria. Es un dato para un humano, no para
      // filtrar.
      type: 'single_line_text_field',
      value: String(value),
    })),
  };
}
