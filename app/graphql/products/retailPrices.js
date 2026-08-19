/**
 * Precio público (retail) de un conjunto de variantes.
 *
 * NO declara `$buyer` y eso es deliberado: es la única query de precios del
 * proyecto que tiene que salir SIN contexto de comprador, porque lo que busca
 * es justamente el precio que ve cualquiera. Ver `app/lib/retail-prices.server.js`.
 *
 * Al no llevar buyer, tampoco cae en la invariante de "las queries con precios
 * no se cachean": este precio es el mismo para todo el mundo.
 */
export const RETAIL_PRICES_QUERY = `#graphql
  query RetailPrices(
    $country: CountryCode
    $language: LanguageCode
    $ids: [ID!]!
  ) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        price {
          amount
          currencyCode
        }
      }
    }
  }
`;
