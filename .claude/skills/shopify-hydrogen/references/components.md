# `@shopify/hydrogen` — referencia rápida

Curada a partir de los exports públicos del paquete (no de `@shopify/hydrogen-react` directamente, aunque Hydrogen re-exporta buena parte de ahí). Import: `import {...} from '@shopify/hydrogen'`.

## Componentes de renderizado (React)

Consumen datos ya traídos por GraphQL — no hacen fetch.

| Componente | Uso |
|---|---|
| `Image` | `<Image data={product.featuredImage} />` — genera `srcset`/`sizes` a partir del fragmento `IMAGE_FRAGMENT` de la Storefront API. |
| `Money` | `<Money data={variant.price} />` — formatea un `MoneyV2` con la moneda/locale correctos. Hook equivalente: `useMoney(money)`. |
| `Video` / `ExternalVideo` | Renderizan `media.mediaContentType === 'VIDEO' \| 'EXTERNAL_VIDEO'`. |
| `MediaFile` | Despacha automáticamente a `Image`/`Video`/`ExternalVideo`/`ModelViewer` según `media.mediaContentType`. Preferible sobre elegir el componente a mano cuando el producto puede tener media mixta. |
| `ModelViewer` | Modelos 3D (`MODEL_3D`). |
| `ShopPayButton` | Botón de compra directa vía Shop Pay. |
| `RichText` | Renderiza un campo `rich_text` metafield/metaobject a HTML seguro. |

**Error común:** ninguno de estos es un tipo de la Storefront GraphQL API — no existen como `api:"storefront"`. Son componentes de `api:"hydrogen"` que reciben como prop el dato ya resuelto.

## Producto / variantes

- `getProductOptions(product)` — arma las opciones combinadas (talle/color/etc.) de un producto con sus variantes, listo para un selector.
- `getAdjacentAndFirstAvailableVariants(product)` — resuelve la variante seleccionada + vecinas disponibles a partir de los `selectedOptions` en la URL.
- `useSelectedOptionInUrlParam(options)` — sincroniza la opción seleccionada con el query param de la URL (deep-linking de variantes).
- `mapSelectedProductOptionToObject(selectedOptions)` — convierte el array `SelectedOptionInput[]` en un objeto plano.
- `flattenConnection(connection)` — aplana un connection GraphQL (`edges { node }`) a un array simple; útil para listas paginadas.
- `parseGid(id)` — descompone un Shopify GID (`gid://shopify/Product/123`) en `{id, resource, resourceId}`.
- `parseMetafield(metafield)` — parsea el `value` tipado de un metafield según su `type`.

## Carrito

- `CartForm` — componente/acción declarativa para mutaciones de carrito (`LinesAdd`, `LinesUpdate`, `LinesRemove`, `DiscountCodesUpdate`, etc.) vía un único endpoint de acción Remix; evita escribir cada mutation de carrito a mano.
- `useOptimisticCart(cart)` — devuelve el carrito con las mutaciones pendientes ya aplicadas optimistamente, para que la UI no espere el roundtrip.
- Cliente `cart` del `AppLoadContext` (creado por `createHydrogenContext`) expone `cart.get()`, `cart.addLines()`, `cart.updateLines()`, etc. cuando no se usa `CartForm`.

## Caching de loaders

Pasar como segundo argumento a `storefront.query(query, {cache})`:

| Estrategia | Cuándo |
|---|---|
| `CacheNone()` | Datos que nunca deben cachearse (carrito, sesión, contenido personalizado). |
| `CacheShort(overrides?)` | Datos que cambian seguido (inventario, precios con descuentos activos). |
| `CacheLong(overrides?)` | Contenido casi estático (páginas, colecciones curadas). |
| `CacheCustom({mode, maxAge, staleWhileRevalidate, sMaxAge, staleIfError})` | Necesitás afinar cada directiva a mano. |

`generateCacheControlHeader(strategy)` genera el header crudo si hace falta setearlo manualmente (raro).

## Customer Account API

El cliente `customerAccount` (del `AppLoadContext`, ver `createHydrogenContext`) expone:

- `login(options?)` / `authorize()` — inician y resuelven el flujo OAuth. `authorize()` va en el loader de la ruta configurada como `authUrl` (default `/account/authorize`).
- `isLoggedIn()` — chequea sesión y refresca el token si hace falta.
- `handleAuthStatus()` — redirige a login si no hay sesión (personalizable con `customAuthStatusHandler`).
- `getAccessToken()` / `getApiUrl()`.
- `query(doc, {variables})` / `mutate(doc, {variables})` — contra la Customer Account API; corren `handleAuthStatus()` antes.
- `logout(options?)` — `postLogoutRedirectUri`, `keepSession`.
- `setBuyer`/`getBuyer` — buyer identity (B2B: company/location) persistida en sesión.

## Analytics

- `sendShopifyAnalytics(payload)` — envía eventos (`ShopifyAddToCart`, `ShopifyPageView`, etc.) al pixel de Shopify.
- `useShopifyCookies()` / `getShopifyCookies()` — cookies de analytics/atribución que Shopify espera.
- `AnalyticsEventName`, `AnalyticsPageType` — enums de los eventos/página estándar.

## Errores

- `GraphQLError` (de `@shopify/hydrogen`) trae `toString()`/`toJSON()` pensados para loggear en Oxygen sin volcar información sensible al browser en producción — preferirlo a loguear el error crudo de la respuesta GraphQL.
