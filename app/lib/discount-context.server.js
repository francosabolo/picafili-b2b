import {EMPTY_DISCOUNT_CONTEXT} from '~/lib/discounts.js';

/**
 * Resuelve los descuentos de acuerdo y de categoría del visitante, en el
 * servidor.
 *
 * **Hoy devuelve siempre el contexto vacío, y eso es correcto**: ninguna de las
 * dos fuentes existe todavía. Este archivo es el lugar —el único— donde entran
 * cuando existan. El resto de la app ya trabaja con la cadena de descuentos, así
 * que enchufarlas es completar esta función y nada más.
 *
 * ## Las dos fuentes posibles, y de qué depende cuál se usa
 *
 * **Shopify**, si los acuerdos se pueden expresar como precios: catálogos B2B y
 * listas de precio por company. Es el camino barato — Shopify calcula, el
 * checkout coincide y no hace falta llamar a nadie.
 *
 * **API de la app propia**, si las reglas son demasiado dinámicas para
 * aplanarlas en listas de precio. Se llama desde acá, del lado del servidor, con
 * el secreto que nunca baja al navegador.
 *
 * Cuál de las dos aplica es una decisión de negocio abierta, y es la que decide
 * la plataforma entera. Está desarrollada en `docs/arquitectura.md` §2.5.
 *
 * ## Contrato que hay que respetar cuando se complete
 *
 * - **Nunca lanzar.** Mismo criterio que `getCustomerContext()`: una API caída o un
 *   catálogo mal configurado no pueden tumbar el storefront.
 * - **Fail-closed.** Ante cualquier fallo, `EMPTY_DISCOUNT_CONTEXT`. Sin
 *   descuentos es un problema comercial; un descuento inventado es plata.
 * - **Timeout duro.** Esto corre en CADA request. Sin un tope, una API lenta
 *   hace lento al sitio entero.
 * - **Acotar lo que llega** con `clampDiscount()` antes de devolverlo: lo que
 *   viene por la red no es de confianza aunque sea de casa.
 * - **Cortar temprano** cuando no hay nada que resolver, para no gastar una
 *   llamada en `/robots.txt`.
 *
 * @param {import('@shopify/remix-oxygen').AppLoadContext} context
 * @returns {Promise<import('~/lib/discounts.js').DiscountContext>}
 */
export async function getDiscountContext(context) {
  // Sin company identificada no hay acuerdo que resolver. Es también el corte
  // temprano que evita trabajo en cada request que no lo necesita.
  if (!context?.b2b?.companyId) return EMPTY_DISCOUNT_CONTEXT;

  return EMPTY_DISCOUNT_CONTEXT;
}
