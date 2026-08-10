import {PRODUCT_CARD_FRAGMENT} from '~/data/fragments';

/**
 * Búsqueda de la pantalla de Compra rápida (E9).
 * Busca por nombre, SKU o marca sobre todo el catálogo — a diferencia del
 * quicksearch del PDP, que está acotado a las variantes de un producto.
 */
export const QUICK_ORDER_SEARCH_QUERY = `#graphql
  query quickOrderSearch(
    $query: String!
    $first: Int!
    $productFilters: [ProductFilter!]
    $country: CountryCode
    $language: LanguageCode
    $buyer: BuyerInput
  ) @inContext(country: $country, language: $language, buyer: $buyer) {
    search(
      query: $query
      first: $first
      types: PRODUCT
      productFilters: $productFilters
    ) {
      totalCount
      # Las categorías del selector salen de acá: son las que Shopify reconoce
      # para este resultado, no una lista hardcodeada que se desactualiza.
      productFilters {
        id
        label
        values {
          id
          label
          count
          input
        }
      }
      nodes {
        ... on Product {
          ...ProductCard
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
`;
