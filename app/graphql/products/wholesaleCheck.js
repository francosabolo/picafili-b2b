/**
 * Una muestra chica de precios, para comprobar si el buyer recibe precio
 * mayorista. Ver `checkWholesalePricing` en `app/lib/b2b.server.js`.
 *
 * Son dos queries con la misma selección: una con `$buyer` (no se cachea, como
 * toda query con buyer) y otra sin buyer (el precio público, que sí se cachea).
 * Comparando las dos se sabe si Shopify le está aplicando un catálogo a esa
 * company location.
 *
 * La selección va repetida a propósito y no interpolada: ver el gotcha de
 * interpolaciones en fragments del CLAUDE.md.
 */
export const WHOLESALE_SAMPLE_QUERY = `#graphql
  query WholesaleSample(
    $country: CountryCode
    $language: LanguageCode
    $buyer: BuyerInput
  ) @inContext(country: $country, language: $language, buyer: $buyer) {
    products(first: 10) {
      nodes {
        variants(first: 1) {
          nodes {
            id
            price {
              amount
            }
          }
        }
      }
    }
  }
`;

export const RETAIL_SAMPLE_QUERY = `#graphql
  query RetailSample($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 10) {
      nodes {
        variants(first: 1) {
          nodes {
            id
            price {
              amount
            }
          }
        }
      }
    }
  }
`;
