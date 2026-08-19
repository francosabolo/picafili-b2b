import {MINIMUM_ORDER_METAFIELD} from '~/lib/const.js';

/**
 * Variables de `CUSTOMER_COMPANY_QUERY`.
 *
 * Existe para que los tres lugares que corren esta query no repitan —ni
 * desincronicen— la lista de metafields que hay que pedir.
 */
export const customerCompanyVariables = () => ({
  minimumOrderIdentifiers: [MINIMUM_ORDER_METAFIELD],
});

/**
 * Company y locations del cliente logueado (E3 del backlog).
 *
 * Devuelve null si la tienda no tiene B2B habilitado o si el cliente no es
 * contacto de ninguna company — por eso siempre se consume con guarda.
 * Los documentos de Customer Account API viven solo en esta carpeta: el
 * codegen los separa por proyecto GraphQL.
 */
export const CUSTOMER_COMPANY_QUERY = `#graphql
  query CustomerCompany($minimumOrderIdentifiers: [HasMetafieldsIdentifier!]!) {
    customer {
      id
      emailAddress {
        emailAddress
      }
      # La aprobación mayorista de esta tienda es un tag, no una company: ver
      # app/lib/customer-tags.js. Viaja acá y no en una query aparte para que
      # el gate no cueste una segunda llamada a Customer Account en cada
      # request. Sí, la Customer Account API expone tags — no hace falta Admin
      # API para leerlos. (Sin backticks en este comentario a propósito: el
      # documento es un template literal y un backtick acá cierra el string y
      # rompe el archivo entero. Ver AGENTS.md → Gotchas.)
      tags
      companyContacts(first: 1) {
        edges {
          node {
            # Las ubicaciones a las que **este contacto** pertenece. Es la
            # fuente correcta y no company.locations: la API expone la
            # empresa entera, pero solo las ubicaciones donde la persona tiene
            # rol. Un contacto sin rol devuelve la empresa con cero ubicaciones
            # — y sin ubicación no hay buyer context, o sea que el portal entra
            # pero no muestra un solo precio.
            locations(first: 10) {
              edges {
                node {
                  id
                  name
                  shippingAddress {
                    countryCode
                    formattedAddress
                  }
                  # El pedido mínimo de ESTA ubicación. Los identifiers entran
                  # por variable y no escritos acá: la lista canónica está en
                  # app/lib/const.js, y una key duplicada en un documento
                  # GraphQL es una que un día deja de coincidir en silencio.
                  metafields(identifiers: $minimumOrderIdentifiers) {
                    key
                    value
                  }
                }
              }
            }
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
