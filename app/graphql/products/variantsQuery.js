/**
 * Variantes por ID, para revalidar una lista guardada contra el catálogo.
 *
 * Una lista de reposición se guarda una vez y se recompra meses después: para
 * entonces los precios, los quiebres por cantidad y la disponibilidad
 * cambiaron. Recargar la lista tal cual quedó guardada arma un presupuesto con
 * precios viejos que después no coinciden con el draft order que emite
 * Shopify — y en B2B esa diferencia se discute con el cliente.
 *
 * Trae exactamente los campos que consume `toQuoteLine`.
 *
 * OJO: sin `quantityAvailable` — el token de Storefront todavía no tiene el
 * scope `unauthenticated_read_product_inventory` (E7) y Shopify responde
 * ACCESS_DENIED para toda la query.
 */
export const VARIANTS_BY_ID_QUERY = `#graphql
  query VariantsById($ids: [ID!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        sku
        availableForSale
        currentlyNotInStock
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
        image {
          url
          altText
        }
        price {
          amount
          currencyCode
        }
        product {
          title
          handle
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

/**
 * Catálogo plano para la lista de precios (E12).
 *
 * Pide solo lo que entra en el CSV. Va paginada porque la lista de precios de
 * una tienda real no entra en una página: el endpoint recorre los cursores.
 */
export const PRICE_LIST_QUERY = `#graphql
  query PriceList($first: Int!, $cursor: String, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: $first, after: $cursor) {
      nodes {
        title
        vendor
        variants(first: 100) {
          nodes {
            sku
            title
            availableForSale
            currentlyNotInStock
            price {
              amount
              currencyCode
            }
            quantityRule {
              minimum
              increment
            }
            quantityPriceBreaks(first: 10) {
              nodes {
                minimumQuantity
                price {
                  amount
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
