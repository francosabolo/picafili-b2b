export const MEDIA_FRAGMENT = `#graphql
  fragment Media on Media {
    __typename
    mediaContentType
    alt
    previewImage {
      url
    }
    ... on MediaImage {
      id
      image {
        id
        url
        width
        height
      }
    }
    ... on Video {
      id
      sources {
        mimeType
        url
      }
    }
    ... on Model3d {
      id
      sources {
        mimeType
        url
      }
    }
    ... on ExternalVideo {
      id
      embedUrl
      host
    }
  }
`;

export const PRODUCT_CARD_FRAGMENT = `#graphql
  fragment ProductCard on Product {
    id
    title
    publishedAt
    handle
    vendor
    variants(first: 1) {
      nodes {
        id
        sku
        availableForSale
        currentlyNotInStock
        # Reglas de cantidad y tier prices (E4/E5). Sin catálogos B2B
        # configurados devuelven defaults (min 1, increment 1, sin quiebres):
        # verificado contra la Storefront API, no dan ACCESS_DENIED.
        quantityRule {
          minimum
          maximum
          increment
        }
        quantityPriceBreaks(first: 10) {
          nodes {
            minimumQuantity
            price {
              amount
              currencyCode
            }
          }
        }
        # OJO: NO agregar quantityAvailable acá hasta que el token de Storefront
        # tenga el scope unauthenticated_read_product_inventory. Sin el scope
        # Shopify responde ACCESS_DENIED y ensucia toda la query.
        # La UI (AvailabilityStatus) ya sabe mostrar el número apenas exista.
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
          # Clave de categoria para los descuentos por categoria. Cual es la
          # fuente lo decide CATEGORY_KEY_SOURCE en app/lib/const.js.
          collections(first: 1) {
            nodes {
              handle
            }
          }
        }
      }
    }
  }
`;
export const PRODUCT_CARD_FRAGMENT_WITH_METAFIELDS = `#graphql
  fragment ProductCardMetafields on Product {
    id
    description
    title
    publishedAt
    handle
    vendor
    variants(first: 1) {
      nodes {
        id
        sku
        availableForSale
        currentlyNotInStock
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
          # Clave de categoria para los descuentos por categoria. Cual es la
          # fuente lo decide CATEGORY_KEY_SOURCE en app/lib/const.js.
          collections(first: 1) {
            nodes {
              handle
            }
          }
        }
      }
    }
    metafields(identifiers: $identifiers) {
      namespace
      key
      description
      value
    }
  }
`;

export const FEATURED_COLLECTION_FRAGMENT = `#graphql
  fragment FeaturedCollectionDetails on Collection {
    id
    title
    handle
    image {
      altText
      width
      height
      url
    }
  }
`;

export const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    __typename
    id
    handle
    tags
    title
    publishedAt
    productType
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
    # Specs para comparar sin abrir la ficha. Los identifiers llegan por
    # variable desde el loader (app/data/metafields.js es la lista canonica):
    # toda query que use este fragment tiene que declarar
    # $metafieldIdentifiers. No van interpolados como literal porque el codegen
    # lee el fragment de forma estatica y no resuelve interpolaciones.
    metafields(identifiers: $metafieldIdentifiers) {
      namespace
      key
      type
      value
    }
     variants(first: 99) {
      nodes {
        id
        sku
        availableForSale
        currentlyNotInStock
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
          # Clave de categoria para los descuentos por categoria. Cual es la
          # fuente lo decide CATEGORY_KEY_SOURCE en app/lib/const.js.
          collections(first: 1) {
            nodes {
              handle
            }
          }
        }
      }
    }
  }
`;
