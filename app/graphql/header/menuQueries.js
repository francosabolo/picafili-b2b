/**
 * Menú de emergencia: solo se usa si la tienda no tiene el menú configurado.
 *
 * Lo que traía el fork era peor que no tener menú: "Home" apuntaba a
 * `https://powerb2x.com/` —o sea, sacaba al comprador de la tienda del cliente
 * y lo mandaba al sitio de la plataforma— y "Product Page" a
 * `/products/demo-product`, un handle que no existe en ninguna tienda real y
 * que devuelve 404.
 *
 * Ahora son rutas del propio storefront y nada más. Los títulos quedan en
 * castellano porque este fallback es un last resort visible: si aparece, lo que
 * hay que hacer es cargar el menú en Shopify, no traducirlo.
 *
 * NO incluye "Compra rápida": el header ya la renderiza aparte —y condicionada
 * a que el visitante pueda ver precios—, así que agregarla acá la duplicaba en
 * la barra. Verificado en pantalla: salía dos veces.
 */
export const FALLBACK_HEADER_MENU = {
  id: 'fallback-header-menu',
  items: [
    {
      id: '1',
      url: '/',
      title: 'Inicio',
    },
    {
      id: '2',
      url: '/collections/all',
      title: 'Catálogo',
    },
  ],
};

/**
 * Menú armado con las **colecciones de la tienda**, para cuando no hay menú
 * cargado en Shopify.
 *
 * Esta tienda no tiene `header-menu`, así que el header venía corriendo con el
 * menú de emergencia: dos links fijos y ninguna categoría. Las colecciones son
 * las mismas que el comprador conoce del sitio retail, ya existen y las
 * mantiene el equipo de la tienda sin tocar código.
 *
 * Sigue siendo un fallback, no un reemplazo: **si alguien carga `header-menu`
 * en Shopify, ese gana**. Un menú de navegación es una decisión editorial —qué
 * va primero, qué no va— y las colecciones ordenadas alfabéticamente no la
 * reemplazan.
 *
 * @param {Array<{id: string, title: string, handle: string}>} collections
 * @param {number} [limit] cuántas entran en la barra antes de que no quepan
 */
export function collectionsHeaderMenu(collections, limit = 5) {
  const items = (collections ?? []).slice(0, limit).map((collection) => ({
    id: collection.id,
    url: `/collections/${collection.handle}`,
    title: collection.title,
  }));

  if (!items.length) return null;

  return {
    id: 'collections-header-menu',
    items: [FALLBACK_HEADER_MENU.items[0], ...items],
  };
}

/**
 * Las colecciones de la tienda, para el menú. Sin precios: por eso se puede
 * cachear (ver la invariante de caché en AGENTS.md).
 */
export const HEADER_COLLECTIONS_QUERY = `#graphql
  query HeaderCollections(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
  ) @inContext(language: $language, country: $country) {
    collections(first: $first, sortKey: TITLE) {
      nodes {
        id
        title
        handle
      }
    }
  }
`;

export const MENU_FRAGMENT = `#graphql
  fragment MenuItem on MenuItem {
    id
    resourceId
    tags
    title
    type
    url
  }
  fragment ChildMenuItem on MenuItem {
    ...MenuItem
  }
  fragment ParentMenuItem on MenuItem {
    ...MenuItem
    items {
      ...ChildMenuItem
    }
  }
  fragment Menu on Menu {
    id
    items {
      ...ParentMenuItem
    }
  }
`;

export const HEADER_QUERY = `#graphql
  fragment Shop on Shop {
    id
    name
    description
    primaryDomain {
      url
    }
    brand {
      logo {
        image {
          url
        }
      }
    }
  }
  query Header(
    $country: CountryCode
    $headerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    shop {
      ...Shop
    }
    menu(handle: $headerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
`;

export const COLLECTION_MENU_QUERY = `#graphql
  fragment Shop on Shop {
    id
    name
    description
    primaryDomain {
      url
    }
    brand {
      logo {
        image {
          url
        }
      }
    }
  }
  query CollectionsMenu(
    $country: CountryCode
    $collectionsMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
   shop {
      ...Shop
    }
    menu(handle: $collectionsMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
`;
