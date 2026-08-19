import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
import {getLocaleFromRequest} from '~/lib/i18n';
import {adminApiClient} from '~/lib/admin-api-client.server.js';
import {getCustomerContext} from '~/lib/b2b.server.js';
import {getDiscountContext} from '~/lib/discount-context.server.js';

/**
 * The context implementation is separate from server.ts
 * so that type can be extracted for AppLoadContext
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext} executionContext
 */
export async function createAppLoadContext(request, env, executionContext) {
  /**
   * Open a cache instance in the worker and a custom session instance.
   */
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);

  const shopifyAdminApiClient = adminApiClient(env);

  const hydrogenContext = createHydrogenContext({
    env,
    request,
    cache,
    waitUntil,
    session,
    i18n: getLocaleFromRequest(request),
    cart: {
      queryFragment: CART_QUERY_FRAGMENT,
    },
    customerAccount: {
      // Enciende el B2B de Hydrogen. Lo que agrega es lo que hace funcionar
      // todo el portal: al autorizar el login emite un token de storefront
      // para el cliente, y ese token es la mitad del `buyer` que scopea las
      // queries al catálogo y a los precios de la company. Sin esto,
      // `UNSTABLE_getBuyer()` devuelve una sesión sin token y las queries
      // caen al mercado por defecto. Ver `app/lib/b2b.server.js`.
      unstableB2b: true,
    },
  });

  // El contexto del cliente se resuelve una vez por request y viaja en el
  // contexto: el gating de precios corre en varios loaders, el gate de acceso
  // corre antes que Remix y el loader del root tambien lo necesita.
  // Resolviendolo en cada lugar habria dos fuentes de verdad —y varias queries
  // a Customer Account por pagina. `getCustomerContext` nunca lanza: ante
  // cualquier problema devuelve tags vacios y b2b null, que es cerrado.
  //
  // `customerTags` es la puerta (quien entra) y `b2b` es el precio (de que
  // catalogo sale cada importe). Van separados porque hoy la tienda tiene lo
  // primero y no lo segundo — ver app/lib/customer-tags.js.
  const {tags: customerTags, b2b} = await getCustomerContext(hydrogenContext);

  // Los descuentos de acuerdo y categoria se resuelven en el SERVIDOR, una vez
  // por request. Nunca en el navegador: un porcentaje que llega del cliente y
  // toca el precio es plata.
  const discountContext = await getDiscountContext({...hydrogenContext, b2b});

  return {
    ...hydrogenContext,
    adminApiClient: shopifyAdminApiClient,
    b2b,
    customerTags,
    discountContext,
    // declare additional Remix loader context
  };
}
