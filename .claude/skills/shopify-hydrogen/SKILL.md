---
name: shopify-hydrogen
description: Desarrollo de storefronts Shopify Hydrogen (Remix + Storefront API + Customer Account API). Usar para CUALQUIER pregunta sobre un storefront Hydrogen — componentes de renderizado (Image, Money, CartForm), caching de loaders, codegen, carrito, cuentas de cliente, cookbook de recipes. No usar para gestión/operación de la tienda (skill `shopify-store-admin`) ni para theme Liquid (skill `shopify-theme`) — Hydrogen es headless, no genera Liquid.
---

# Desarrollo Hydrogen (storefront headless)

Hydrogen es el framework oficial de Shopify para storefronts headless: Remix + un cliente de **Storefront API** y otro de **Customer Account API**, deployado normalmente como Oxygen worker. Priorizá siempre las utilidades del paquete `@shopify/hydrogen` sobre reconstruir a mano lo que ya resuelve el framework.

## Regla mandatoria

Si la tarea es sobre un storefront Hydrogen, **usá las utilidades/componentes de `@shopify/hydrogen`** en vez de GraphQL Storefront crudo + JSX a mano. El framework ya resuelve: renderizado de producto/precio/media, carrito optimista, caching de loaders, contexto de cliente y analytics.

## Distinción crítica: renderizar vs. consultar

`Image`, `Video`, `ExternalVideo`, `MediaFile`, `ModelViewer`, `Money`, `ShopPayButton` son **componentes React** del paquete `@shopify/hydrogen`. **Renderizan** datos que ya llegaron por GraphQL — no son tipos de la Storefront API y no hacen fetch. No los confundas con el fragmento GraphQL que trae esos mismos datos (ese sí vive en el documento `/* GraphQL */` y pasa por `storefront.query`). Ver `references/components.md` para la lista completa con firmas.

## Antes de escribir código no trivial

1. Si el pedido matchea uno de los temas del cookbook (B2B, bundles, combined listings, custom cart method, contenido dinámico con metaobjects, GTM, infinite scroll, markets, subscriptions, cache de APIs de terceros...) buscá la recipe correspondiente antes de improvisar — ver `references/cookbook.md`.
2. Si el proyecto tiene conectado el plugin oficial de Shopify (`shopify-plugin:shopify-hydrogen` / marketplace `claude-plugins-official`), es la fuente más actualizada de docs y tipos — preferila para dudas puntuales de API.
3. Después de agregar/editar cualquier query o mutation `/* GraphQL */`, corré `npm run codegen` (o el script equivalente del proyecto) — los tipos generados se commitean.

## Caching de loaders

Usá las estrategias del paquete en vez de armar headers de cache a mano: `CacheNone()`, `CacheShort(overrides?)`, `CacheLong(overrides?)`, `CacheCustom(options)`. Se pasan como segundo argumento a `storefront.query(query, {cache: CacheShort()})`.

## Referencia detallada

| Archivo | Cuándo leerlo |
|---|---|
| `references/components.md` | Firma y uso de los componentes/hooks/utilidades de `@shopify/hydrogen` (Image, Money, CartForm, Analytics, caching, Customer Account) |
| `references/cookbook.md` | Índice de recipes oficiales del cookbook de Hydrogen y cómo consultarlas |

## Tareas típicas

- **Renderizar producto/precio/media** → componentes `Image`/`Money`/`MediaFile` sobre el fragmento GraphQL correspondiente, nunca reconstruyendo el markup a mano.
- **Carrito no actualiza / carrito optimista** → `useOptimisticCart` + `CartForm`, no estado propio duplicado.
- **Selector de variantes** → `getProductOptions` / `getAdjacentAndFirstAvailableVariants` sobre el producto, no lógica de combinaciones a mano.
- **Cuentas de cliente (login, pedidos, direcciones)** → cliente `customerAccount` (login/authorize/isLoggedIn/handleAuthStatus/query/mutate), documentos GraphQL restringidos a `app/graphql/customer-account/*` (ver convención del proyecto en su propio `AGENTS.md`/`CLAUDE.md`).
- **Nueva query/mutation GraphQL** → agregar el documento `/* GraphQL */`, correr `npm run codegen`, commitear los `.generated.d.ts`.
- **Analytics** → helpers de `@shopify/hydrogen` (`sendShopifyAnalytics`, `useShopifyCookies`, `AnalyticsEventName`) en vez de trackear eventos a mano.
