import {clampDiscount, getEffectiveDiscount} from '~/lib/discounts.js';
import {DEMO_ROLE_SWITCHER, DISCOUNT_SLOTS} from '~/lib/const.js';

/** Tope de líneas por cotización. */
export const MAX_LINE_ITEMS = 250;
/** Shopify corta el PO en 100; se valida acá para dar un error entendible. */
export const MAX_PO_LENGTH = 100;

/**
 * ¿Puede este request aplicar descuentos de vendedor?
 *
 * ⚠️ **Esta es la frontera de seguridad del endpoint, y hoy es de DEMO.**
 *
 * El input del draft order se endureció a lista blanca justamente para que
 * nadie pudiera mandar `appliedDiscount` desde afuera: es un endpoint público y
 * un descuento arbitrario es plata. El Descuento 3 obliga a reabrirlo para el
 * vendedor, y "soy vendedor" hoy es una **cookie**, que la escribe el cliente.
 *
 * O sea: mientras el switcher de demo esté activo, cualquiera puede ponerse la
 * cookie y aplicarse hasta `MAX_LINE_DISCOUNT`. Es tolerable en una demo donde
 * el draft order lo revisa un humano antes de cobrar; **no lo es en
 * producción**.
 *
 * Por eso falla cerrado: con `DEMO_ROLE_SWITCHER` en `false` —que es como debe
 * quedar una tienda real— no se acepta **ningún** descuento, ni siquiera de un
 * vendedor, hasta que exista autenticación de verdad (Customer Account API con
 * rol, o un token de personal). Mejor sin la función que con una puerta
 * abierta.
 *
 * @param {Request} request
 */
export function canApplyRepDiscounts(request) {
  if (!DEMO_ROLE_SWITCHER) return false;

  const cookie = request?.headers?.get('Cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)demoAccountState=([^;]+)/);
  return match ? decodeURIComponent(match[1]) === 'sales_rep' : false;
}

/**
 * Arma el input del draft order a partir de lo que mandó el cliente.
 *
 * **Este endpoint es público**: cualquier visitante puede postearle. Antes el
 * `input` del body viajaba TAL CUAL a la Admin API, así que se podía mandar
 * cualquier campo de `DraftOrderInput` — entre ellos `appliedDiscount` y
 * `originalUnitPrice`, o sea fijarse uno mismo el precio y el descuento.
 *
 * Por eso el input se arma acá desde cero con lista blanca: del cliente solo se
 * toman variante, cantidad, email, nota, PO y —si el request está autorizado—
 * el porcentaje de descuento. Los precios los pone Shopify a partir del
 * `variantId`.
 *
 * Vive fuera de la ruta para poder verificarlo sin levantar el worker ni tener
 * un token de Admin válido.
 *
 * @param {any} body
 * @param {boolean} allowDiscounts
 * @returns {{input?: object, error?: string}}
 */
export function buildDraftOrderInput(body, allowDiscounts = false) {
  const source = body?.input ?? {};

  const lineItems = (Array.isArray(source.lineItems) ? source.lineItems : [])
    .map((line) => {
      const item = {
        variantId: String(line?.variantId ?? ''),
        quantity: Math.max(1, Math.floor(Number(line?.quantity) || 0)),
      };

      // `DraftOrderLineItemInput.appliedDiscount` es UNO SOLO: Shopify no
      // acepta varios descuentos por línea. Así que los slots del presupuesto
      // se combinan en el efectivo, con el mismo modo (cascada o suma) que usa
      // la pantalla — si acá se sumara y allá se encadenara, el pedido no
      // coincidiría con el presupuesto que vio el cliente.
      //
      // Se recorre `DISCOUNT_SLOTS` y no las claves que mandó el cliente: así
      // un slot inventado desde afuera no entra. Y se vuelve a acotar cada
      // porcentaje aunque el cliente ya lo haya hecho: lo que llega por la red
      // no es de confianza.
      //
      // Viaja como PORCENTAJE y no como importe: que la cuenta la haga Shopify
      // evita que el precio del pedido dependa de la aritmética del navegador.
      const applied = allowDiscounts
        ? DISCOUNT_SLOTS.filter((slot) => slot.source === 'quote')
            .map((slot) => ({
              percent: clampDiscount(line?.discounts?.[slot.id]),
            }))
            .filter((entry) => entry.percent)
        : [];

      const percent = getEffectiveDiscount(applied);
      if (percent) {
        item.appliedDiscount = {
          value: percent,
          valueType: 'PERCENTAGE',
          title: 'Descuento del presupuesto',
          description: 'Aplicado al emitir el presupuesto',
        };
      }

      return item;
    })
    .filter((line) =>
      line.variantId.startsWith('gid://shopify/ProductVariant/'),
    );

  if (!lineItems.length) {
    return {error: 'El pedido no tiene líneas válidas'};
  }

  if (lineItems.length > MAX_LINE_ITEMS) {
    return {error: `Máximo ${MAX_LINE_ITEMS} líneas por pedido`};
  }

  const email = String(source.email ?? '').trim();
  if (!email) {
    return {error: 'Falta el email de contacto'};
  }

  const poNumber = String(source.poNumber ?? '').trim();
  if (poNumber.length > MAX_PO_LENGTH) {
    return {
      error: `La orden de compra no puede superar ${MAX_PO_LENGTH} caracteres`,
    };
  }

  const note = String(source.note ?? '').trim();

  return {
    input: {
      lineItems,
      email,
      ...(note ? {note} : {}),
      ...(poNumber ? {poNumber} : {}),
    },
  };
}
