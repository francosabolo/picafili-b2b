# Cookbook de Hydrogen — índice de recipes

Shopify mantiene un cookbook oficial con recipes paso a paso para features comunes de storefront. Antes de implementar alguno de estos temas desde cero, buscá la recipe:

- Si está conectado el plugin oficial de Shopify en Claude Code (marketplace `claude-plugins-official`, skill `shopify-plugin:shopify-hydrogen`), invocala — trae las recipes actualizadas y valida el código generado contra la API real.
- Si no, buscar en la documentación de shopify.dev bajo `/docs/storefronts/headless/hydrogen/cookbook`.

## Temas cubiertos por el cookbook oficial

- **B2B Commerce** — buyer identity, company locations, catálogos y precios por company.
- **Bundles** — productos compuestos por otros productos.
- **Combined Listings** — un producto que agrupa variantes de productos separados (ej. por color).
- **Custom Cart Method** — extender el cliente de carrito con lógica propia.
- **Dynamic Content with Metaobjects** — secciones/contenido editorial dirigido por metaobjects.
- **Express Server** — correr Hydrogen sobre un servidor Express en vez de Oxygen.
- **Google Tag Manager Integration** / **Partytown + GTM** — GTM cargado sin bloquear el hilo principal.
- **Infinite Scroll** — paginación de colecciones/búsqueda sin reload.
- **Legacy Customer Account Flow** — flujo de cuentas previo al Customer Account API actual (solo para proyectos que aún no migraron).
- **Markets** — multi-mercado (moneda/idioma/país) sobre Storefront API.
- **Subscriptions** — productos con compra recurrente (selling plans).
- **Third-party API Queries and Caching** — cómo integrar un fetch a una API externa dentro del modelo de caching de loaders de Hydrogen (no romper el patrón `CacheShort`/`CacheLong` por hacerlo a mano).

Esta lista es orientativa (la fuente de verdad es el cookbook publicado por Shopify, que se actualiza con cada release de Hydrogen) — si el pedido no matchea ninguno, no fuerces una recipe: es un desarrollo normal siguiendo `references/components.md`.
