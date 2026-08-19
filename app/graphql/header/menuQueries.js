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
