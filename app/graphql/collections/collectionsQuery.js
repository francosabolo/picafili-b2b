import {PRODUCT_ITEM_FRAGMENT} from '~/data/fragments';

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection

export const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query CollectionDetails(
    $handle: String!
    $metafieldIdentifiers: [HasMetafieldsIdentifier!]!
    $country: CountryCode
    $language: LanguageCode
    $filters: [ProductFilter!]
    $first: Int
    $last: Int
    $reverse: Boolean
    $startCursor: String
    $endCursor: String
    $sortKey: ProductCollectionSortKeys = TITLE
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      descriptionHtml
      metafields(
        identifiers: [
          {
            key: "banner_mobile",
            namespace: "collection"
          },
          { 
            key: "banner_desktop",
            namespace: "collection"
      	  }
        ]
      ){
        key
        value
          reference {
        ... on MediaImage {
          image {
            url
          }
        }
      }
      }
      seo {
        description
        title
      }
      image {
        id
        url
        width
        height
        altText
      }
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor,
        filters: $filters,
        reverse: $reverse
        sortKey: $sortKey
      ) {
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
            swatch {
              color
              image {
                image {
                  url
                }
              }
            }
          }
        }
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
    collections(first: 100) {
      edges {
        node {
          title
          handle
        }
      }
    }
  }
`;

// NOTE: https://shopify.dev/docs/api/storefront/2024-01/objects/product
export const CATALOG_QUERY = `#graphql
  query Catalog(
    $metafieldIdentifiers: [HasMetafieldsIdentifier!]!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(first: $first, last: $last, before: $startCursor, after: $endCursor, query: "") {
      nodes {
        ...ProductItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
`;

/**
 * Catálogo completo CON filtros facetados.
 *
 * `CATALOG_QUERY` usa la conexión raíz `products`, que **no acepta filtros**:
 * los facets solo existen en `Collection.products` y en `search`. Por eso
 * "Todos los productos" era la única pantalla del sitio sin filtros — no
 * faltaba renderizar el componente, faltaba de dónde sacar las facetas.
 *
 * `query: "*"` trae el catálogo entero (mismo truco que compra rápida).
 */
export const CATALOG_FILTERED_QUERY = `#graphql
  query CatalogFiltered(
    $metafieldIdentifiers: [HasMetafieldsIdentifier!]!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $productFilters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    search(
      query: "*"
      types: PRODUCT
      first: $first
      last: $last
      before: $startCursor
      after: $endCursor
      productFilters: $productFilters
    ) {
      nodes {
        ...ProductItem
      }
      productFilters {
        id
        label
        type
        values {
          id
          label
          count
          input
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
`;
