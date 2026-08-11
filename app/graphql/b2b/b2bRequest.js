/**
 * Solicitud de acceso mayorista — documentos de **Admin API**.
 *
 * Van por Admin y no por Storefront porque escriben sobre el cliente, y la
 * Storefront API no escribe clientes. Igual que las cotizaciones: el
 * `ADMIN_API_ACCESS_TOKEN` no sale del servidor.
 *
 * ⚠️ Estos documentos **no pasan por codegen** (ver AGENTS.md → Superficies de
 * datos). Nadie los tipa: un campo mal escrito falla recién contra Shopify.
 */

/**
 * Guarda la solicitud y marca al cliente, en una sola ida.
 *
 * Las dos mutations van en la misma operación a propósito. GraphQL las ejecuta
 * **en serie**, así que no puede quedar el tag puesto sin los datos detrás —
 * que es el orden que rompe el backoffice: una solicitud que aparece en el
 * filtro y no tiene nada para leer.
 */
export const B2B_REQUEST_SUBMIT_MUTATION = `#graphql
  mutation B2BRequestSubmit(
    $metafields: [MetafieldsSetInput!]!
    $customerId: ID!
    $tags: [String!]!
  ) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
      }
      userErrors {
        field
        message
      }
    }
    tagsAdd(id: $customerId, tags: $tags) {
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * ¿Este cliente ya pidió acceso?
 *
 * Se lee por Admin y no por Customer Account API para no depender de que esa
 * otra superficie exponga metafields de cliente — es una sola llamada, en una
 * sola ruta, y a cambio no hay una suposición que verificar sin túnel.
 */
export const B2B_REQUEST_STATUS_QUERY = `#graphql
  query B2BRequestStatus($customerId: ID!, $identifiers: [HasMetafieldsIdentifier!]!) {
    customer(id: $customerId) {
      id
      metafields(identifiers: $identifiers) {
        key
        value
      }
    }
  }
`;
