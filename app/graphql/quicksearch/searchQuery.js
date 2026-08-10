import {
  PRODUCT_CARD_FRAGMENT,
  PRODUCT_CARD_FRAGMENT_WITH_METAFIELDS,
} from '~/data/fragments';

// https://shopify.dev/docs/api/storefront/2024-07/queries/search
export const GET_FILTERS_QUERY = `#graphql
query getFilters(
  $query: String!
  $country: CountryCode,
  $language: LanguageCode,
  $buyer: BuyerInput,
) @inContext(language: $language, country: $country, buyer: $buyer)
{
  search(first:1, query: $query) {
    productFilters {
      id
      label
      presentation
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
  }
}`;

export const SEARCH_QUERY = `#graphql
query searchWithFilters(
    $query: String!,
    $first: Int,
    $last: Int,
    $productFilter: [ProductFilter!],
    $identifiers: [HasMetafieldsIdentifier!]!,
    $startCursor: String,
    $country: CountryCode,
    $language: LanguageCode,
    $buyer: BuyerInput,
    $endCursor: String
  ) @inContext(country: $country, language: $language, buyer: $buyer){
    search(
      query: $query,
      first: $first,
      last: $last,
      productFilters: $productFilter,
      before: $startCursor,
      after: $endCursor){
        edges {
          node {
          ...ProductCardMetafields
          }
        }
        productFilters {
          id
          label
          presentation
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
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
${PRODUCT_CARD_FRAGMENT_WITH_METAFIELDS}
`;

export const PRODUCT_SEARCH_RESULT_FRAGMENT = `#graphql
    fragment ProductSearchResult on Product {
        id
        title
        description
        handle
        metafields(identifiers: {namespace: "custom", key: "apertura"}) {
            namespace
            key
            value
        }
    }
`;
