import {useNonce, getShopAnalytics, Analytics, Script} from '@shopify/hydrogen';
import {parseQuoteSummary} from '~/lib/quote-storage.js';
import {DEMO_ROLE_SWITCHER, ENABLE_CART} from '~/lib/const.js';
import {hasRequiredCustomerTags} from '~/lib/customer-tags.js';
import {withRetailCartCompareAt} from '~/lib/retail-prices.server.js';
import {
  canSeePricesOnServer,
  gateDiscounts,
} from '~/lib/price-gating.server.js';
import {defer} from '@shopify/remix-oxygen';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  useRouteError,
  useRouteLoaderData,
  ScrollRestoration,
  useMatches,
  isRouteErrorResponse,
} from '@remix-run/react';
import favicon from './assets/favicon.png';
import appStyles from './styles/global.scss?url';
import {PageLayout} from '~/components/PageLayout/PageLayout.jsx';
import {HEADER_QUERY} from '~/graphql/header/menuQueries.js';
import {FOOTER_QUERY} from '~/graphql/footer/footerQueries.js';
import {UserProvider} from '~/context/UserContext.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {GoogleGTM} from '~/components/GoogleGTM/GoogleGTM.jsx';
/**
 * This is important to avoid re-fetching root queries on sub-navigations
 * @type {ShouldRevalidateFunction}
 */
export const shouldRevalidate = ({
  formMethod,
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  return defaultShouldRevalidate;
};

export function links() {
  return [
    {rel: 'stylesheet', href: appStyles},
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    // El isotipo de Picafili, el mismo que usa picafili.com.ar. El anterior era
    // el del skeleton de Hydrogen: la pestaña del portal mayorista no se
    // parecía en nada a la de la tienda.
    {rel: 'icon', type: 'image/png', href: favicon},
  ];
}

/**
 * @param {LoaderFunctionArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const {storefront, env} = args.context;

  return defer({
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    },
  });
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {LoaderFunctionArgs}
 */
async function loadCriticalData({context, request}) {
  const {storefront} = context;
  const i18n = context.storefront.i18n;
  // Resuelto, no diferido: el estado de cuenta se pinta en el primer render y
  // un `await` de una promesa acá abajo llegaría tarde. Es barato — lee la
  // sesión, no la red: el refresh de token ya corrió al armar el contexto.
  const loggedIn = await context.customerAccount.isLoggedIn();
  const [header] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'header-menu', // Adjust to your header menu handle
      },
    }),
  ]);

  return {
    header,
    i18n,
    // Origen absoluto de esta request. Las funciones `meta` de Remix no ven la
    // request, y el canonical, las alternas por idioma y las tarjetas sociales
    // necesitan URLs absolutas. Sale de la request y no de una constante para
    // que valga igual en local, en el preview de Oxygen y el día que la tienda
    // ate un dominio propio.
    origin: new URL(request.url).origin,
    // El estado de cuenta simulado se lee acá y no solo en el cliente: si el
    // provider lo tomaba de la cookie recién al hidratar, el server renderizaba
    // "invitado" y el cliente otra cosa → hydration mismatch.
    //
    // Con el switcher apagado ni se lee: una cookie vieja de una demo anterior
    // seguía gobernando la UI y pintaba "Cuenta aprobada — Distribuidora El
    // Sol" ARRIBA de la pantalla que dice que la cuenta está en revisión.
    demoAccountState: DEMO_ROLE_SWITCHER
      ? readCookie(request, 'demoAccountState')
      : null,
    loggedIn,
    // Lo MISMO que decidió el gate, no una segunda opinión. Mientras la UI
    // derivaba el estado de la company y el gate miraba los tags, la sala de
    // espera se pintaba con un banner verde de "Cuenta aprobada" arriba del
    // texto que explica que la cuenta no lo está.
    wholesaleApproved: hasRequiredCustomerTags(context.customerTags),
    // El email de la sesión, para que el presupuesto no se lo pregunte a
    // alguien que ya inició sesión. No es un secreto: es su propio email, el
    // mismo con el que entró.
    customerEmail: context.customerEmail ?? null,
    // Contexto B2B real, **sin el buyer**. Es null mientras la tienda no tenga
    // B2B habilitado o el visitante no sea contacto de una company.
    b2b: publicB2B(context.b2b),
    // Pasa por el MISMO gate que los precios: ver gateDiscounts().
    discountContext: gateDiscounts(
      context.discountContext,
      canSeePricesOnServer(request, context.b2b),
    ),
    gtmId: context.env.PUBLIC_GTM_ID || null,
    // Solo el RESUMEN del presupuesto (cuántas unidades, cuántas líneas). Las
    // líneas viven en localStorage porque no entran en una cookie; esto es lo
    // único que el servidor necesita para pintar la barra sin que parpadee.
    quoteSummary: parseQuoteSummary(readCookie(request, 'quoteSummary')),
  };
}

/**
 * La parte del contexto B2B que puede viajar al navegador.
 *
 * ⚠️ **`buyer` no sale del servidor.** Lleva el `customerAccessToken` de
 * storefront del cliente, que es una credencial: mandarlo en el payload de
 * Remix lo deja escrito en el HTML de cada página, a la vista de cualquiera
 * que abra el código fuente. El navegador no lo necesita para nada — quien
 * scopea las queries es el loader—, así que la UI solo se entera de si el
 * contexto está armado o no.
 *
 * @param {{companyId: string, companyName: string, locations: Array, activeLocationId: string|null, buyer: object|null}|null} b2b
 */
function publicB2B(b2b) {
  if (!b2b) return null;

  const {buyer, ...rest} = b2b;

  return {...rest, hasBuyerContext: Boolean(buyer)};
}

/**
 * @param {Request} request
 * @param {string} name
 */
function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {LoaderFunctionArgs}
 */
function loadDeferredData({context}) {
  const {storefront, customerAccount, cart} = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your footer menu handle
      },
    })
    .catch((error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  return {
    // Con el carrito apagado no se pide: era una subrequest a Storefront en
    // CADA página para alimentar un drawer que no se renderiza, y de paso
    // mandaba un `checkoutUrl` vivo en el payload de una tienda que no tiene
    // checkout. Los únicos consumidores son el drawer y `/cart`, y los dos
    // están detrás del mismo interruptor.
    // El tachado de cada línea tiene que ser el precio público, igual que en
    // el listado. Se encadena a la promesa para no perder el streaming: el
    // carrito sigue siendo dato diferido.
    cart: ENABLE_CART
      ? cart
          .get()
          .then((resolved) => withRetailCartCompareAt(context, resolved))
      : null,
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
  };
}

/**
 * @param {{children?: React.ReactNode}}
 */
export function Layout({children}) {
  const matches = useMatches();
  // `handle` arrancó siendo una string: la clase que va al <body>. Ahora
  // algunas rutas necesitan además marcar cosas de layout (ver `bareLayout`
  // en PageLayout), así que se aceptan las dos formas — string suelta u
  // objeto con `bodyClass`. Sin esto un handle objeto pintaba
  // `[object Object]` como clase, y uno ausente, la palabra `undefined`.
  const routeHandle = matches[matches.length - 1]?.handle;
  const bodyClass =
    typeof routeHandle === 'string'
      ? routeHandle
      : routeHandle?.bodyClass ?? '';
  const nonce = useNonce();
  /** @type {RootLoader} */
  const data = useRouteLoaderData('root');
  const error = useRouteError();

  const errorNotFound = error?.status == 404;
  const gtmId = data?.gtmId;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/* Montserrat: tipografía de marca Picafili (body 500 / bold 800) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;800&display=swap"
        />
        <Meta />
        <Links />
        {/* GTM solo si hay contenedor configurado. El ID estaba hardcodeado y
            era el de PowerB2X: la demo de Picafili le mandaba su tráfico al
            contenedor de la plataforma. Ver AGENTS.md → Operación. */}
        {gtmId && (
          <Script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');`,
            }}
          ></Script>
        )}
      </head>
      <body
        className={`${bodyClass}
            ${errorNotFound ? 'not-found-404' : ''}
          `}
      >
        {data ? (
          <Analytics.Provider
            cart={data.cart}
            shop={data.shop}
            consent={data.consent}
          >
            <UserProvider>
              <PageLayout {...data}>{children}</PageLayout>
            </UserProvider>
            <GoogleGTM />
          </Analytics.Provider>
        ) : (
          children
        )}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        {/*<noscript>*/}
        {/*  <iframe*/}
        {/*    src="https://www.googletagmanager.com/ns.html?id=GTM-NT7CT7BN"*/}
        {/*    height="0"*/}
        {/*    width="0"*/}
        {/*    style={{display: 'none', visibility: 'hidden'}}*/}
        {/*  ></iframe>*/}
        {/*</noscript>*/}
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const {t} = useTranslation();
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  if (errorStatus == 404) {
    // Un 404 mayorista no es un callejon: quien llego aca desde un link viejo
    // o un producto despublicado sigue queriendo pedir. Se le ofrecen las tres
    // puertas que importan en vez de un unico "volver al inicio".
    return (
      <div className="route-error">
        <h1>{t('error-404.title')}</h1>
        <p className="route-error-lead">{t('error-404.lead')}</p>
        <div className="route-error-actions">
          <a className="return-to-store" href="/collections/all">
            {t('error-404.button')}
          </a>
          <a className="route-error-secondary" href="/compra-rapida">
            {t('error-404.quick-order')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="route-error">
      <h1>{t('error.title')}</h1>
      <p className="route-error-lead">{t('error.lead')}</p>
      <div className="route-error-actions">
        <a className="return-to-store" href="/collections/all">
          {t('error-404.button')}
        </a>
      </div>
      {/* El mensaje tecnico se guarda, no se grita: antes salia crudo en un
          <pre> en la cara del comprador. Sigue estando para quien lo necesite
          —soporte, una captura— pero detras de un click. */}
      {errorMessage && (
        <details className="route-error-detail">
          <summary>{t('error.detail')}</summary>
          <pre>
            {errorStatus} — {errorMessage}
          </pre>
        </details>
      )}
    </div>
  );
}

/** @typedef {LoaderReturnData} RootLoader */

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @typedef {import('@remix-run/react').ShouldRevalidateFunction} ShouldRevalidateFunction */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
