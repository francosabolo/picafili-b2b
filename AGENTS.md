# AGENTS.md — Picafili / PowerB2X demo (Storefront Shopify Hydrogen)

## Identidad del proyecto

- **Qué es:** storefront headless B2B de la tienda **Picafili** (`picafili.myshopify.com`), publicado
  en Oxygen como **"Pb2x demo"** — la demo de PowerB2X. El código viene forkeado de un storefront de
  iluminación (de ahí que queden metafields de producto de ese vertical: lúmenes, temperatura,
  CRI, IP…).
  La pieza propia de B2B es el **flujo de cotización (quote)**: el usuario arma una lista de
  productos y se emite un **draft order** vía Admin API, consultable después en `/account/quotes`.
- **Stack:** Hydrogen `2024.7.4` + Remix `2.10.1`, JavaScript (JSX + JSDoc, **no TS**), Vite 5,
  Tailwind 3 + SCSS modules. Deployado como **Oxygen worker** (`server.js` → `createRequestHandler`
  de `@shopify/remix-oxygen`). Node `20.16.0`, npm (hay `package-lock.json`; no usar yarn/pnpm).
- **Comandos:**
  - `npm run dev` — dev server con codegen en watch
  - `npm run build` — build de producción **con codegen**
  - `npm run preview` — build + preview con mini-oxygen
  - `npm run codegen` — regenera `storefrontapi.generated.d.ts` / `customer-accountapi.generated.d.ts`
  - `npm run lint` / `npm run format` / `npm run format:check`
  - `npm run doctor` — contrasta lo que la plantilla **declara** contra lo que la tienda **tiene**:
    env vars, moneda y país, menús por handle, metafields, tag del modelo padre/hijo, fuente de la
    categoría, catálogos B2B y el scope de inventario. **Corré esto primero al apuntar el `.env` a
    una tienda nueva.** No está en el gate porque necesita red y credenciales.
- **Gate de verificación:** `./scripts/verify.sh` (alias `npm run verify`) — formato → lint → escalas
  de diseño → datos de tienda → codegen → build. Los tres del medio corren solo sobre las **líneas
  nuevas**: la deuda del fork no bloquea, pero nada nuevo entra. Ninguna tarea se cierra sin el gate en verde (skill `verify-gate`).
  El lint acotado (`scripts/lint-changed-lines.mjs`) existe porque el fork arrastra ~159 errores
  preexistentes: lintear el archivo entero obligaba a pagar toda esa deuda para cambiar dos líneas.
  Para ver la deuda completa: `npm run lint`.
- **Backlog / tickets:** no hay backlog formal. Los pedidos llegan por Slack/mail y los criterios de
  aceptación se acuerdan con el PM antes de escribir código (skill `definition-of-done`): escribilos
  en el hilo del pedido, no los des por sobreentendidos.

- **Decisiones de arquitectura:** `docs/arquitectura.md` — dónde vive cada cosa (Shopify, app propia,
  storefront), las limitaciones funcionales de Liquid, y la pregunta que decide la plataforma. Este
  archivo es el manual operativo; ese es el documento de decisión.

## Portal cerrado — solo mercado B2B

Este storefront **no tiene navegación anónima ni compra directa**. Tres interruptores en
`app/lib/const.js` lo definen, y un solo archivo los aplica:

| Constante             | En true                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| `REQUIRE_LOGIN`       | todo redirige a `/ingresar` salvo el flujo de login                           |
| `REQUIRE_B2B_COMPANY` | sin company de Shopify → `/cuenta-en-revision`, sin catálogo ni precios       |
| `ENABLE_CART` (false) | se van el drawer, `/cart`, `/cart/$lines` y `/api/cart/*` — solo draft orders |

**El gate vive en `app/lib/access.server.js` y corre en `server.js`, antes que Remix.** Está ahí y
no en los loaders para que **una ruta nueva nazca cerrada**: olvidarse de una guarda no abre un
agujero, porque no hay guarda que copiar. Abrir algo es escribirlo en `PUBLIC_PATHS` a mano.
Para documentos devuelve un redirect con `return_to`; para `/api/*`, un 401 — un redirect a HTML le
llega al `fetch()` del navegador como un 200 con un cuerpo que no puede parsear.

**El buyer context es lo que hace que el mercado sea el B2B.** `getB2BContext` resuelve la company
y guarda la location con `setBuyer`; `getBuyerVariables(context)` se spreadea en las `variables` de
**toda query de catálogo**, que declara `$buyer: BuyerInput` y lo pasa por
`@inContext(country:, language:, buyer:)`. Sin eso Shopify contesta con los precios del mercado por
defecto **sin avisar** — datos válidos, de otro comprador.

⚠️ El codegen **no cubre** los documentos de `app/graphql/**` (el `.graphqlrc.js` los excluye del
proyecto de Storefront), así que ahí no hay red de seguridad de tipos: una operación que use `buyer`
sin declararlo falla recién en runtime, en la página. Las de las rutas sí se tipan.

Tres cosas que no son obvias y cuestan caro:

- **`unstableB2b: true` en `createHydrogenContext` no es opcional.** Es lo que hace que Hydrogen
  emita el token de storefront del cliente, que es la mitad del `buyer`. Y lo emite **solo al
  autorizar el login y al refrescar el token**, no en cada request: una sesión abierta desde antes
  de encenderlo no lo tiene hasta que refresque. Por eso `resolveBuyer` devuelve `null` en vez de un
  buyer a medias, y sin buyer completo **no se muestran precios**.
- **Una query con `buyer` no se cachea.** El precio pasó a ser por company location: una entrada
  compartida de caché es la lista de precios de un cliente servida a otro. La home cachea el listado
  de categorías (sin precios) y NO los productos.
- **`b2b` no viaja entero al cliente.** `publicB2B()` en `root.jsx` le saca el `buyer` antes de
  mandarlo: lleva el `customerAccessToken`, y el payload de Remix se lee en el código fuente.

Verificar esto necesita **companies cargadas en Shopify**, y `REQUIRE_B2B_COMPANY` con cero
companies deja el sitio inaccesible para todos sin un solo error a la vista: responde 200 y manda a
todo el mundo a "cuenta en revisión". `npm run doctor` chequea justo eso contra Admin API — y avisa
fuerte cuando **no puede** comprobarlo, que es lo que pasa en local porque el
`ADMIN_API_ACCESS_TOKEN` del `.env` es un placeholder.

## Superficies de datos

- **Storefront API:** documentos GraphQL en `app/graphql/{cart,collections,products,footer,header,quicksearch}/`
  y fragments en `app/data/fragments.js` / `app/lib/fragments.js`. Correr `npm run codegen` tras editar
  cualquier query/mutation (o dejar `npm run dev`, que lo hace en watch).
- **Customer Account API:** documentos **restringidos a `app/graphql/customer-account/`** — el
  `.graphqlrc.js` los separa en un proyecto GraphQL propio con otro schema. Alimentan las rutas
  `/account/*`: perfil, direcciones, órdenes y **cotizaciones** (`CustomerDraftOrdersQuery`,
  `CustomerDraftOrderQuery`).
- **Admin API:** cliente propio en `app/lib/admin-api-client.server.js` (`@shopify/admin-api-client`,
  API version `2025-01`), inyectado en el contexto como `context.adminApiClient`. Existe porque la
  **Storefront API no puede crear draft orders**: es lo que hace `POST /api/draft-order/create`
  (mutation en `app/graphql/draft-orders/draftOrders.js`). Sus documentos **no** pasan por codegen.
- **Datos propios fuera de Shopify:** ninguno. No hay base de datos: el carrito de cotización vive en
  cookies del cliente (`quoteItems`, `consultItems`, `userData` vía `js-cookie`) hasta que se emite el
  draft order.

## i18n / mercados

- **Locales soportados:** `es` (**default**, la tienda es argentina), `en`, `fr` — definidos en
  `app/i18n/locales.jsx`, diccionarios en `app/i18n/translations/*.json`, hook `useTranslation`.
- **Resolución de locale:** por **ruta** — todas las rutas viven bajo `($locale).*` y
  `getLocaleFromRequest` (`app/lib/i18n.js`) mapea el primer segmento del path.
- **Markets de Shopify:** el país y la moneda son de la **tienda**, no del idioma:
  `STORE_COUNTRY` / `STORE_CURRENCY` en `app/lib/const.js`. El prefijo de ruta solo elige idioma.
  Si el negocio pide precios/moneda por país, eso es un mercado nuevo en Shopify, no un `if` en
  `getLocaleFromRequest` (skill `criterio-de-negocio`).
- **Agregar un idioma:** sumarlo a `STORE_LANGUAGES` y poner su JSON en `app/i18n/translations/`.
  `app/lib/i18n.js` no se toca.

## Esto es una plantilla

El objetivo es que **apuntar el `.env` a otra tienda de Shopify alcance para que el portal
funcione**. La regla operativa: si algo específico de una tienda aparece hardcodeado en un
componente, es un bug de plantilla y su lugar es el bloque de configuración arriba de
`app/lib/const.js`.

**Esta clase de bug no falla ruidosamente, y por eso hay un chequeo en el gate**
(`scripts/check-template-leaks.mjs`, paso 4/6). Los casos reales encontrados: `tag:parent` en la
búsqueda dejaba `/search` devolviendo **cero resultados para cualquier palabra** —mostraba "sin
resultados", no un error—; `product.grouped` filtraba el listado; el mail de la tienda vivía dentro
de `Footer.jsx`; 10 rutas decían `PowerB2X | Cart` en el `<title>`; el "Home" del menú de emergencia
mandaba al sitio de la plataforma. Son **datos válidos, solo que de otra tienda**: el build compila,
el lint pasa y los tipos cierran.

El chequeo corta emails, URLs absolutas y nombres de marca en líneas nuevas fuera de `const.js` y los
diccionarios. Al instalar la plantilla en un cliente nuevo, sumá su marca a `BRAND_WORDS` para que el
siguiente no herede sus datos.

**La otra mitad la cubre `npm run doctor`**, porque un tag o un metafield de otra tienda es una
string cualquiera y solo se detecta preguntándole a la tienda. Shopify no protesta por ninguno:
filtrar por un tag que nadie tiene devuelve 0 resultados, pedir un metafield inexistente devuelve
`null`, y pedir un menú por un handle que no existe devuelve `null` y el componente cae a su
fallback. Los tres se ven como "esta parte no anda", nunca como un error que apunte a la causa.

⚠️ **Esta tienda no tiene `header-menu` ni `collections-menu`**, así que el header está corriendo con
`FALLBACK_HEADER_MENU`. No es teórico: hasta hace poco ese fallback mandaba "Home" a
`https://powerb2x.com/` y "Product Page" a un handle que da 404.

De dónde sale cada cosa, para no volver a clavarla:

| Dato                                                      | Fuente                                                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Nombre y logo de la tienda                                | Shopify (`shop.name`, `shop.brand.logo`) — ver `BrandMark` y `pageTitle()`                                       |
| Descripción / bajada de la home                           | Shopify (`shop.description`), con fallback en i18n                                                               |
| Categorías de la home                                     | las colecciones de la tienda                                                                                     |
| País, moneda, idiomas                                     | `app/lib/const.js`                                                                                               |
| Textos de UI                                              | `app/i18n/translations/*.json`                                                                                   |
| Colores y tipografía                                      | bloque de tokens arriba de `app/styles/_app.scss` — escalas en `DESIGN.md`                                       |
| Precios y separadores                                     | `<Price>`, que formatea según el idioma activo                                                                   |
| Descuentos (cuántos, nombres, quién edita, cómo acumulan) | `DISCOUNT_SLOTS`, `CATEGORY_DISCOUNTS_ENABLED`, `DISCOUNT_STACK_MODE`, `MAX_LINE_DISCOUNT` en `app/lib/const.js` |

**Lo que todavía NO es plantilla** (heredado del fork o pendiente):

- ✅ ~~Toda la zona de cuenta y cotizaciones en inglés~~ — `QuoteView`, `QuoteTable` y
  `AccountProfileForm` mostraban "Product / Price / Discounted Price / Shipping Address / Last name"
  en un sitio con castellano por defecto. Eran **copias** de los componentes de pedidos a las que se
  les perdió el `useTranslation()` en la copia: las claves ya existían en `order`/`orders`. Si creás
  un componente copiando otro, revisá que el `t()` viaje con él.
- ✅ ~~Copy nuevo hardcodeado en castellano~~ — `AccountStateBanner`, `PriceBreaks`,
  `MinimumOrderNotice`, `compra-rapida`, el email del drawer y los `<title>` ya salen de i18n.
  Los `<title>` van por `pageTitle()`, que resuelve el diccionario con `getLocaleDictionary`
  porque las funciones `meta` de Remix no pueden usar hooks. **Ojo: esta línea estuvo mintiendo.**
  Quedaban 10 rutas (carrito, búsqueda, blogs, políticas, páginas, órdenes, cotizaciones) con
  `` `PowerB2X | Cart` `` escrito a mano y en inglés. Si tocás una ruta, confirmá que su `meta` use
  `pageTitle(matches, …)` — el patrón es fácil de saltear porque `meta` recibe `{data}` por defecto
  y hay que pedirle `matches` explícitamente.
- `app/data/metafields.js` describe el catálogo de la vertical de iluminación del fork. Una tienda
  sin esas definiciones no rompe (la query devuelve `null`) pero tampoco muestra nada.
- `MINIMUM_ORDER_AMOUNT` es un valor de demo en pesos; ver E13 del backlog.

## Convenciones del proyecto

- **Routing:** Remix flat-file routes en `app/routes/`, todas con prefijo `($locale).`:
  - `($locale)._index.jsx` → home del portal mayorista: hero + categorías (las colecciones de la
    tienda) + destacados. El CTA secundario y la bajada de destacados cambian según estado de cuenta.
  - `($locale).products.$handle` (ficha completa con metafields técnicos) y
    `($locale).simple-products.$handle` (ficha reducida).
  - `($locale).account.*` → Customer Account API; `($locale).account.quotes.*` → cotizaciones.
  - `($locale).compra-rapida` → quick order pad: búsqueda por nombre/SKU, filtros y alta a la nota.
  - `($locale).api.*` → endpoints internos del storefront (cart, draft orders, países, predictive search).
- **Metafields que lee el storefront:** el catálogo completo está en **`app/data/metafields.js`** —
  esa es la fuente de verdad de los `identifiers` que se le pasan a la Storefront API. Namespaces:
  `product` (lumens, temperature, cri, apertura, potencia, family, sku, finishings, dimming…),
  `details`, `tech_docs`, `downloads`, `custom` (quicksearch), `collection` (imágenes de colección).
  Las definiciones son del admin de la tienda: **si agregás una key acá, tiene que existir en Shopify**
  o la query devuelve `null` silenciosamente.
- **Sesión/auth de cliente:** `AppSession` custom (`app/lib/session.js`) sobre
  `createCookieSessionStorage`, cookie `session`, secret en `SESSION_SECRET` (el worker tira error al
  arrancar si falta). El login de cliente es Customer Account API (`/account/login` → `authorize`).
  Aparte, `UserContext`/`QuoteContext` guardan datos del usuario **en cookies del navegador** para que
  un invitado pueda armar una cotización sin loguearse — eso no es sesión segura, no metas nada
  sensible ahí.

## Invariantes de dominio — no romper

- **Los documentos de Customer Account API viven solo en `app/graphql/customer-account/`.** El codegen
  los separa por proyecto GraphQL: uno fuera de esa carpeta se valida contra el schema equivocado y
  rompe el build.
- **El carrito y todo lo que dependa del cliente logueado nunca se cachea.** El `CacheLong()` de
  `root.jsx` es para header/footer/menús; queries de cart, cuenta y cotizaciones van sin caché.
- **El gate de acceso es uno solo y corre en `server.js`.** No agregues guardas de sesión en loaders
  sueltos: el default es cerrado y lo que se abre se escribe en `PUBLIC_PATHS`.
- **Toda query que devuelva precios lleva `$buyer` y no se cachea.** Sin buyer, Shopify contesta con
  el mercado por defecto en silencio; con caché compartida, con los precios de otra company.
- **El `buyer` (y su `customerAccessToken`) no sale del servidor.** Al cliente va `publicB2B()`.
- **Las cotizaciones se crean únicamente por Admin API (draft orders), nunca por Storefront API**, y
  siempre desde el servidor (`app/lib/admin-api-client.server.js` + rutas `api.*`). El
  `ADMIN_API_ACCESS_TOKEN` no puede tocar el bundle de cliente.
- **`app/data/metafields.js` es la lista canónica de metafields.** No hardcodees identifiers sueltos
  dentro de una query o un componente.
- **Tras tocar cualquier `.graphql`/query, correr codegen y commitear los `*.generated.d.ts`.**
- **El proyecto es JavaScript.** No introduzcas `.ts`/`.tsx` en `app/`: el tipado es JSDoc y
  `jsconfig.json` tiene `checkJs: false`.

## Operación

- **Deploy:** GitHub Actions → Oxygen. El workflow vivo es
  `.github/workflows/oxygen-deployment-1000165300.yml` (storefront **1000165300 = "Pb2x demo"**, el
  que coincide con `.shopify/project.json`). Dispara en `on: [push]` de **cualquier branch**: cada
  push genera un deployment de preview y `main` es el que queda como producción.
  Los workflows heredados del fork (`1000018987` y `1000031099`) fallaban en cada push porque sus
  secrets no existen en este repo: ya fueron borrados.
- **Env vars requeridas:** `SESSION_SECRET`, `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_ID`,
  `PUBLIC_STOREFRONT_API_TOKEN`, `PRIVATE_STOREFRONT_API_TOKEN`, `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`,
  `PUBLIC_CUSTOMER_ACCOUNT_API_URL`, `PUBLIC_CHECKOUT_DOMAIN`, `SHOP_ID` y **`ADMIN_API_ACCESS_TOKEN`**.
  Opcional: `PUBLIC_GTM_ID` — sin ella no se carga Google Tag Manager. El ID estaba hardcodeado y era
  el contenedor de PowerB2X, así que la demo de Picafili le mandaba su tráfico a la plataforma.
  En CI: secret `OXYGEN_DEPLOYMENT_TOKEN_1000165300`.
- **`ADMIN_API_ACCESS_TOKEN` solo está cargada en las env vars de Oxygen**, no en el `.env` local. Sin
  ella **el sitio entero tira 500 en local**, no solo las cotizaciones: `createAdminApiClient` lanza
  `Admin API Client: an access token must be provided` dentro de `createAppLoadContext`, que corre en
  cada request. Agregala al `.env` (aunque sea un placeholder) antes de levantar el dev server.
- **Local:** `/account/*` necesita un dominio público (túnel), ver el README y los pasos 1–2 de la doc
  de Customer Account API de Shopify.

## Ritmo de trabajo — no verifiques en cada cambio

Medido en esta sesión, el ciclo ingenuo cuesta **2 a 3 minutos por cambio**, y lo caro **no es
mirar la pantalla**:

| Paso                                             | Costo   |
| ------------------------------------------------ | ------- |
| `npm run format`                                 | ~5 s    |
| `./scripts/verify.sh` (el build domina)          | 60–90 s |
| Reiniciar la preview — que **vuelve a buildear** | 40–60 s |
| Navegar, medir, capturar                         | ~20 s   |

El desperdicio grande es **buildear dos veces** (el gate builda, y `npm run preview` builda otra vez)
y **reiniciar el servidor** en cada cambio. La regla:

1. **Agrupá cambios.** Varios arreglos → un gate → una pasada visual. No un gate por edición.
2. **Para el loop visual usá `npm run dev`**, que tiene recarga en caliente: de ~100 s a ~2 s. La
   salvedad está más abajo en los gotchas — en dev el CSS entra recién al hidratar, así que para
   **juzgar estética** hay que usar `npm run preview`. Para **medir** (anchos, desbordes, tamaños)
   dev sirve igual.
3. **Medí por JS antes de capturar.** `scrollWidth`, `getBoundingClientRect` y `getComputedStyle` son
   instantáneos y detectan un desborde mejor que el ojo. La captura se reserva para cuando el
   problema es de aspecto, no de medida.
4. **El gate completo, una vez, antes de commitear.**

Lo que **no** se recorta: no digas que algo está arreglado sin haberlo visto en el navegador. En una
sola sesión, cuatro bugs eran invisibles en el código —un ícono renderizado fuera de su `viewBox`, un
aviso que quedaba en `opacity: 0`, un título partido a mitad de palabra, y 62 px de tabla
inalcanzables por un `overflow: hidden`—. Se baja la **frecuencia** de la verificación, no el hábito.

⚠️ Y antes de reportar un bug visual, descartá la red: el CDN de Shopify llegó a devolver 502/504
desde la máquina de desarrollo, y el síntoma es idéntico al de imágenes rotas por código.

## Verificación visual en mobile

El resize del navegador **no funciona** con estas herramientas: reporta éxito y `window.innerWidth` se
queda en 1512. La forma que sí funciona es un **iframe**, porque evalúa las media queries contra su
propio ancho. El obstáculo es que Hydrogen manda `frame-ancestors 'none'` por CSP —correcto en
producción, no se toca—, así que hace falta un proxy local que quite ese header y sirva una página con
`<iframe width="390">` apuntando a la preview. El proxy vive en el scratchpad, nunca en el repo.

Vale la pena: en la primera pasada a 390 aparecieron tres cosas que no se ven en el código —el `h1` del
reset en 100px fijos partiendo "Presupuesto" al medio, el título de colección con un override que lo
dejaba **más grande** en el teléfono que en escritorio, y el estado de stock reducido a un círculo de
color sin etiqueta.

## Gotchas de la plataforma

- **Ruta nueva en `app/routes/` → 500 raro con `Cannot read properties of undefined (reading 'module')`
  desde el `<Scripts>` de Remix.** No es tu código: es el manifest de rutas de Remix quedándose viejo.
  Se arregla reiniciando el dev server, no debuggeando el componente.
- **Los fragments GraphQL son template literals de JS: nunca pongas backticks dentro de un comentario
  `#`.** Cierran el string y rompen el archivo entero — el sitio pasa a 503 sin error obvio.
- **Tampoco pongas una interpolación `${...}` de texto GraphQL calculado dentro de un fragment.** El
  codegen lee los documentos de forma **estática** y no la resuelve: tira `Variable "X" not found.
This might be a bug in @shopify/graphql-codegen` **y sale 0**. El build termina bien y los
  `*.generated.d.ts` se quedan viejos en silencio. Lo que sí funciona es una **variable de query**
  (`$metafieldIdentifiers` en `PRODUCT_ITEM_FRAGMENT`, `$identifiers` en la ficha): entonces cada
  operación que use el fragment tiene que declararla, y el codegen te dice cuáles te faltaron.
  Interpolar **otro fragment** sí está bien. El paso 4/5 del gate existe por esto: corre el codegen
  aparte y le mira la salida, no solo el exit code.
- **`quantityAvailable` requiere el scope `unauthenticated_read_product_inventory`** en el token de
  Storefront. Sin él Shopify responde ACCESS_DENIED y ensucia la query completa.
- **El sitio se ve SIN estilos (Times New Roman).** Hay **dos causas distintas** y conviene
  separarlas antes de tocar nada:
  1. **Con `Parse error .../global.scss:<línea>:<col>` en consola** → hay **CSS inválido en esa línea**
     y el parser del dev server aborta el bundle entero. Andá a esa línea del CSS servido
     (`curl 'http://localhost:PORT/app/styles/global.scss?direct'`); no borres `node_modules/.vite`.
     **El build de producción NO se queja**, así que el gate pasa en verde y parece intermitente.
     Ya pasó con `repeat(var(--n), …)`: el contador de `repeat()` tiene que ser un entero literal.
  2. **Sin ningún error en consola** → es **normal en desarrollo y NO llega a producción**. En dev el
     `<link rel="stylesheet">` apunta a `/app/styles/global.scss`, que Vite sirve como
     `Content-Type: text/javascript`; el navegador se niega a aplicar una hoja con MIME de JS, así que
     ese link no aporta nada y **todo el CSS entra recién al hidratar**. Si el JS tarda, la página se
     ve rota mientras tanto. Verificado contra el build: en producción el link es
     `/assets/global-<hash>.css` servido como `text/css`. **Para revisar look & feel usá
     `npm run preview`**, que sirve el build real y no tiene este parpadeo.
- **Cuidado con los selectores de elemento sin acotar: `main`, `aside`, `header` también existen dentro
  de los drawers.** Un `main { padding-bottom: 6rem }` pensado para la página le comía 96px de alto útil
  a todos los drawers. Usá `main:not(aside main)`.
- **Alto de los drawers: no mezcles `height: 100%` con flex en la misma cadena.** `aside > main >
.quoteBasket > .quoteBasketContainer` son todos flex items; un `height: 100%` contra un padre sin
  alto definido colapsa al alto del contenido y la lista de ítems queda aplastada mientras sobra
  espacio en blanco abajo. Cada eslabón va con `flex: 1 1 auto; min-height: 0`.
- **El repo vive anidado dentro de otro** (`powerb2x-web/`, que es Next.js y tiene `eslint.config.mjs`).
  Por eso el script de lint fuerza `ESLINT_USE_FLAT_CONFIG=false`.

## Deuda conocida (no la heredes en código nuevo)

- `npm run lint` completo devuelve ~159 errores preexistentes del fork (`no-undef` en
  `parseAsCurrency`/`locale`, variables sin usar, optional chaining inseguro). Por eso el gate lintea
  **solo los archivos tocados**: lo nuevo entra limpio. Si arreglás un archivo entero, mejor.
- ✅ ~~`api.draft-orders.jsx` usaba `context.shopifyAdminApiClient`~~ — arreglado, usa `adminApiClient`.

<!-- ai-skills:begin — generado por install.sh, no editar a mano: se regenera en cada corrida -->

## Base de conocimiento (ai-skills)

Módulos instalados: core + shopify-hydrogen. Repo central: ver `.claude/ai-skills-manifest`.
Este índice es agnóstico a la herramienta: cuando la tarea lo pida, leé el archivo indicado.
Con Claude Code las guías y roles se cargan solos; con otra herramienta/LLM, abrí el archivo
(los roles sirven como system prompt para el agente que uses).

| Guía                                             | Cuándo leerla                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.claude/skills/criterio-de-negocio/SKILL.md`    | Detectar cuándo un pedido "simple" esconde una decisión de negocio (hardcodear datos que vienen de una fuente de verdad, excepciones a una regla, cambios con consecuencia contractual o de plata) y devolverla al PM con opciones y trade-offs en vez de implementarla en silencio. Usar ANTES de implementar cualquier pedido que toque datos o reglas de negocio.                                                                                         |
| `.claude/skills/definition-of-done/SKILL.md`     | Cómo entra y cómo se cierra el trabajo en la agencia — criterios de aceptación verificables ANTES de escribir código, y qué significa "done". Usar al arrancar cualquier feature o bug, y al decidir si una tarea está terminada.                                                                                                                                                                                                                            |
| `.claude/skills/escalar-aprendizaje/SKILL.md`    | Escala aprendizajes generalizables desde este proyecto al repo central ai-skills de la agencia (commit + push) para que todos los proyectos futuros los hereden. Usar cuando descubras un gotcha de plataforma, un patrón que funcionó, o el usuario te corrija algo que aplica más allá de este proyecto.                                                                                                                                                   |
| `.claude/skills/postmortem/SKILL.md`             | Registro de 10 líneas después de resolver un bug de producción o incidente — síntoma, causa raíz, fix, prevención — conectado al learning loop de la agencia. Usar SIEMPRE después de arreglar algo que llegó a producción o costó más de una iteración diagnosticar.                                                                                                                                                                                        |
| `.claude/skills/resilient-architecture/SKILL.md` | Checklist de arquitectura resiliente y performante de la agencia — idempotencia, colas, reintentos, timeouts, caching, N+1, observabilidad. Usar al diseñar features con integraciones/colas/webhooks, al revisar arquitectura, o cuando algo "se pierde", se duplica o anda lento en producción.                                                                                                                                                            |
| `.claude/skills/shopify-hydrogen/SKILL.md`       | Desarrollo de storefronts Shopify Hydrogen (Remix + Storefront API + Customer Account API). Usar para CUALQUIER pregunta sobre un storefront Hydrogen — componentes de renderizado (Image, Money, CartForm), caching de loaders, codegen, carrito, cuentas de cliente, cookbook de recipes. No usar para gestión/operación de la tienda (skill `shopify-store-admin`) ni para theme Liquid (skill `shopify-theme`) — Hydrogen es headless, no genera Liquid. |
| `.claude/skills/verify-gate/SKILL.md`            | El gate de verificación único del proyecto — el comando que prueba que "terminé" es verdad. Usar antes de dar por cerrada CUALQUIER tarea de código (feature, bug, refactor), y al arrancar en un proyecto que todavía no tiene gate.                                                                                                                                                                                                                        |
| `.claude/skills/visual-check/SKILL.md`           | Verificación visual obligatoria antes de cerrar cualquier cambio de UI — cómo levantar el dev server según el stack y qué viewports capturar. Usar siempre que un cambio afecte lo que se ve en pantalla.                                                                                                                                                                                                                                                    |

| Rol (prompt reutilizable)         | Para qué                                                                                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.claude/agents/architect.md`     | Diseña o revisa arquitectura con foco en resiliencia y performance — integraciones, marketplaces, automatizaciones, cualquier sistema con colas, webhooks o APIs externas. Usar ANTES de construir una feature no trivial, o para auditar un diseño/sistema existente.                                       |
| `.claude/agents/code-reviewer.md` | Revisa un diff, branch o PR buscando bugs reales y desvíos de las convenciones del proyecto. Usar antes de dar por cerrada cualquier tarea no trivial, o cuando el usuario pida "revisá esto".                                                                                                               |
| `.claude/agents/qa-visual.md`     | Verifica visualmente cambios de UI levantando el proyecto, tomando screenshots en desktop y mobile, y comparando contra el diseño de referencia. Usar antes de cerrar cualquier cambio que afecte lo que se ve en pantalla.                                                                                  |
| `.claude/agents/spec-writer.md`   | Convierte un pedido de cliente (o interno) en una mini-spec — objetivo, criterios de aceptación, fuera de alcance, preguntas abiertas — antes de que nadie escriba código. Usar cuando llega un pedido de feature no trivial, especialmente si viene en lenguaje de cliente ("quiero que la tienda haga X"). |

Aprendizaje continuo: si descubrís algo generalizable (gotcha de plataforma, patrón validado,
corrección aplicable a futuros proyectos), seguí `.claude/skills/escalar-aprendizaje/SKILL.md`
para subirlo al repo central. Lo específico de este proyecto se documenta acá, en este archivo.

<!-- ai-skills:end -->
