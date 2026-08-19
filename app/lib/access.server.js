import {json, redirect} from '@shopify/remix-oxygen';
import {
  ENABLE_CART,
  REQUIRE_LOGIN,
  REQUIRE_B2B_COMPANY,
  STORE_LANGUAGES,
} from '~/lib/const.js';
import {hasRequiredCustomerTags} from '~/lib/customer-tags.js';

/**
 * Gate de acceso del portal — **el único**.
 *
 * Corre en `server.js`, antes de que Remix mire las rutas. Está ahí y no en
 * cada loader por una razón concreta: un gate repartido por rutas se cae solo.
 * Alcanza con que alguien agregue `($locale).lo-que-sea.jsx` y se olvide de
 * copiar la guarda para abrir un agujero que no falla ruidosamente —la página
 * anda, simplemente la ve cualquiera—. Acá el default es cerrado y abrir algo
 * cuesta escribirlo en `PUBLIC_PATHS`.
 *
 * Devuelve `null` cuando la request puede seguir, o la `Response` que la corta.
 */

/** Antesala del portal: explica qué hay adentro y arranca el login. */
export const LOGIN_PATH = '/ingresar';

/** Logueado pero todavía sin company asignada en Shopify. */
export const PENDING_PATH = '/cuenta-en-revision';

/** Donde se guarda la solicitud de acceso mayorista. */
export const REQUEST_API_PATH = '/api/solicitud-acceso';

/**
 * Lo único que alcanza una sesión **sin company**: la sala de espera y el
 * endpoint que recibe su solicitud.
 *
 * El endpoint tiene que estar acá o el gate le contesta 401 a la única persona
 * que puede usarlo — y como es un `fetch()`, el fallo se ve como un formulario
 * que no hace nada, no como una pantalla de error.
 */
const PENDING_ALLOWED = new Set([PENDING_PATH, REQUEST_API_PATH]);

/**
 * Rutas que tienen que responder sin sesión, sin excepción: son las que
 * *producen* la sesión. Cerrarlas deja el portal sin puerta de entrada.
 */
const PUBLIC_PATHS = new Set([
  LOGIN_PATH,
  '/account/login',
  '/account/authorize',
  '/account/logout',
  '/robots.txt',
]);

/**
 * Todo lo que lleva al checkout de Shopify.
 *
 * `/cart/<variante>:<cantidad>` es el que más importa de los tres: arma un
 * carrito desde la URL y **redirige derecho al checkout**, sin pasar por
 * ninguna pantalla. Esconder el ícono del carrito no lo desactiva.
 */
const CART_PATTERNS = [/^\/cart(\/|$)/, /^\/api\/cart(\/|$)/];

/**
 * Prefijos que no son páginas: assets del build, internos de Vite en
 * desarrollo y las herramientas de Hydrogen.
 *
 * En producción Oxygen sirve `/assets/*` antes del worker, así que esto es
 * sobre todo un seguro para el dev server — donde el bundle y las hojas de
 * estilo sí pasan por acá y devolverles un redirect al login deja la pantalla
 * en blanco, un síntoma que no se parece en nada a su causa.
 */
const BYPASS_PREFIXES = [
  '/assets/',
  '/build/',
  '/images/',
  '/styles/',
  '/node_modules/',
  '/.well-known/',
  '/@', // /@vite, /@fs, /@id — internos del dev server
  '/__', // rutas internas de Remix
  '/graphiql',
  '/subrequest-profiler',
];

/**
 * Saca el prefijo de idioma para que la allowlist se escriba una sola vez.
 * `/en/ingresar` y `/ingresar` son la misma ruta a los fines del gate.
 *
 * @param {string} pathname
 */
function stripLocale(pathname) {
  const [, first, ...rest] = pathname.split('/');

  if (first && STORE_LANGUAGES.includes(first.toUpperCase())) {
    return `/${rest.join('/')}`;
  }

  return pathname;
}

/**
 * Normaliza para comparar: sin barra final, y `''` pasa a `/`.
 *
 * @param {string} pathname
 */
function normalize(pathname) {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

/**
 * Corta la request de la forma que corresponde a quien la hizo.
 *
 * Un endpoint `/api/*` lo llama JavaScript del navegador esperando JSON: un
 * redirect a una pantalla HTML le llega como 200 con un cuerpo que no puede
 * parsear, y el error termina apareciendo lejos de acá. 401 es la respuesta
 * honesta.
 *
 * ⚠️ **Llamá a los `/api/*` con `fetch` plano, no con `useFetcher`.** Esta
 * respuesta no lleva el protocolo de Remix —se arma antes que Remix— así que un
 * fetcher no la lee como dato: la escala al error boundary y **se lleva puesta
 * la página entera**. Verificado en el navegador con el formulario de
 * solicitud: en vez del error en el campo salía "Algo falló de nuestro lado".
 * La convención del repo ya era `fetch` (ver `QuoteContext.jsx`).
 *
 * @param {string} path ruta sin prefijo de idioma
 * @param {string} destination a dónde mandar a un navegador
 */
function deny(path, destination) {
  if (path.startsWith('/api/')) {
    return json({error: 'Unauthorized'}, {status: 401});
  }

  return redirect(destination);
}

/**
 * @param {{request: Request, context: import('@shopify/remix-oxygen').AppLoadContext}}
 * @returns {Promise<Response|null>}
 */
export async function checkAccess({request, context}) {
  const url = new URL(request.url);

  if (BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return null;
  }

  const path = normalize(stripLocale(url.pathname));

  // El prefijo de idioma activo, para no devolver a alguien que navega en
  // francés a la pantalla en castellano.
  const prefix = context.storefront.i18n.pathPrefix ?? '';

  // Sin carrito, sus rutas tampoco existen. Va antes del chequeo de sesión
  // porque no es una cuestión de permisos: esa funcionalidad está apagada
  // para todo el mundo.
  if (!ENABLE_CART && CART_PATTERNS.some((pattern) => pattern.test(path))) {
    return deny(path, `${prefix}/presupuesto`);
  }

  if (!REQUIRE_LOGIN) return null;

  if (PUBLIC_PATHS.has(path)) return null;

  const loggedIn = await context.customerAccount.isLoggedIn();

  if (!loggedIn) {
    // `return_to` lo lee el propio `customerAccount.login()` de Hydrogen, así
    // que quien entró por un link a un producto vuelve a ese producto y no a
    // la home.
    const returnTo = encodeURIComponent(url.pathname + url.search);
    return deny(path, `${prefix}${LOGIN_PATH}?return_to=${returnTo}`);
  }

  // La aprobación mayorista de esta tienda es un TAG del cliente, no una
  // company. Es una chapuza consciente y está explicada entera en
  // `app/lib/customer-tags.js`: acá alcanza con saber que decide **quién
  // entra** y que no decide nada sobre precios.
  //
  // Va antes del chequeo de company porque es el que está activo: hoy
  // `REQUIRE_B2B_COMPANY` está apagado justamente porque no hay companies
  // cargadas. Los dos mandan a la misma pantalla de espera, así que quien no
  // pasa ve lo mismo pase lo que pase.
  if (!hasRequiredCustomerTags(context.customerTags)) {
    if (PENDING_ALLOWED.has(path)) return null;
    return deny(path, `${prefix}${PENDING_PATH}`);
  }

  if (REQUIRE_B2B_COMPANY && !context.b2b?.companyId) {
    if (PENDING_ALLOWED.has(path)) return null;
    return deny(path, `${prefix}${PENDING_PATH}`);
  }

  // Con company asignada la pantalla de espera ya no describe nada.
  if (path === PENDING_PATH) return redirect(`${prefix}/`);

  return null;
}
