/**
 * Company y locations del cliente logueado (E3 del backlog).
 *
 * Devuelve null si la tienda no tiene B2B habilitado o si el cliente no es
 * contacto de ninguna company — por eso siempre se consume con guarda.
 * Los documentos de Customer Account API viven solo en esta carpeta: el
 * codegen los separa por proyecto GraphQL.
 */
export const CUSTOMER_COMPANY_QUERY = `#graphql
  query CustomerCompany {
    customer {
      id
      emailAddress {
        emailAddress
      }
      companyContacts(first: 1) {
        edges {
          node {
            company {
              id
              name
              locations(first: 10) {
                edges {
                  node {
                    id
                    name
                    shippingAddress {
                      countryCode
                      formattedAddress
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
