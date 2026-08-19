import {json} from '@shopify/remix-oxygen';

/**
 * Diagnóstico del contexto B2B de **la sesión que lo pide**.
 *
 * Existe porque el síntoma "no veo precios" tiene cuatro causas distintas que
 * en pantalla se ven exactamente igual: no hay sesión, no hay tags, no hay
 * company, o hay company pero falta el token de storefront del comprador. Sin
 * esto la única forma de distinguirlas era leer los logs del worker.
 *
 * ⚠️ **Devuelve booleanos, nunca credenciales.** El `customerAccessToken` del
 * buyer es una credencial: acá se informa si existe (`storefrontToken: true`),
 * jamás su valor. Los tags sí viajan enteros porque son datos del propio
 * cliente que está pidiendo, y son justo lo que hay que poder comparar contra
 * lo que muestra el admin.
 *
 * @param {LoaderFunctionArgs}
 */
export async function loader({context}) {
  const loggedIn = await context.customerAccount.isLoggedIn();

  // Se lee del cliente de Hydrogen y no de `context.b2b` a propósito: es la
  // fuente original, y la diferencia entre las dos es justamente lo que hay
  // que diagnosticar cuando `b2b.buyer` viene en null.
  const buyer = loggedIn
    ? await context.customerAccount.UNSTABLE_getBuyer()
    : null;

  return json({
    loggedIn,
    tags: context.customerTags ?? [],
    company: Boolean(context.b2b?.companyId),
    companyName: context.b2b?.companyName ?? null,
    locations: context.b2b?.locations?.length ?? 0,
    activeLocation: Boolean(context.b2b?.activeLocationId),
    // Las dos mitades del buyer context, por separado. Si `location` es true y
    // `storefrontToken` es false, la sesión se abrió antes de que Hydrogen
    // pudiera emitirlo (lo emite al autorizar el login y al refrescar): se
    // arregla cerrando sesión y volviendo a entrar. Si es al revés, el que
    // falta es el vínculo del cliente con la company location.
    buyerLocation: Boolean(buyer?.companyLocationId),
    storefrontToken: Boolean(buyer?.customerAccessToken),
    // Lo que mira el resto de la app para decidir si muestra precios.
    buyerReady: Boolean(context.b2b?.buyer),
  });
}

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
