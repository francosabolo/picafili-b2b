// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/cart
export const CART_QUERY_FRAGMENT = `#graphql
  fragment Money on MoneyV2 {
    currencyCode
    amount
  }
  fragment CartLine on CartLine {
    id
    quantity
    attributes {
      key
      value
    }
    cost {
      totalAmount {
        ...Money
      }
      amountPerQuantity {
        ...Money
      }
      compareAtAmountPerQuantity {
        ...Money
      }
    }
    merchandise {
      ... on ProductVariant {
        id
        availableForSale
        compareAtPrice {
          ...Money
        }
        price {
          ...Money
        }
        requiresShipping
        title
        image {
          id
          url
          altText
          width
          height

        }
        product {
          handle
          title
          id
          vendor
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
  fragment CartApiQuery on Cart {
    updatedAt
    id
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: $numCartLines) {
      nodes {
        ...CartLine
      }
    }
    cost {
      subtotalAmount {
        ...Money
      }
      totalAmount {
        ...Money
      }
      totalDutyAmount {
        ...Money
      }
      totalTaxAmount {
        ...Money
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      code
      applicable
    }
  }
`;

/**
 * Lo que devuelven las MUTACIONES del carrito.
 *
 * Existe por una razón concreta: el botón de agregar necesita saber si la línea
 * entró de verdad —una variante sin stock hace que Shopify responda sin errores
 * y sin línea— y el fragmento por defecto solo trae `id` y `totalQuantity`.
 *
 * ⚠️ **Sin variables.** Se intentó reusar `CART_QUERY_FRAGMENT` y el carrito
 * entero dejó de funcionar: ese fragmento pide `lines(first: $numCartLines)`, y
 * las mutaciones no declaran esa variable — la primera baja de una línea
 * terminaba en "Algo falló de nuestro lado". Acá el número va literal.
 *
 * Trae lo mínimo para verificar, no el carrito completo: quien pinta el drawer
 * es la query del root, no esta respuesta.
 *
 * ⚠️ **El nombre no es libre: tiene que ser `CartApiMutation`.** Hydrogen arma
 * las mutaciones con `...CartApiMutation` adentro y le pega este texto al
 * final; con cualquier otro nombre el spread apunta a un fragmento que no
 * existe y **todas** las operaciones del carrito fallan a la vez — agregar,
 * cambiar cantidad y borrar—, con un 500 que no dice nada. Lo mismo vale para
 * el de la query, que tiene que llamarse `CartApiQuery`.
 */
export const CART_MUTATE_FRAGMENT = `#graphql
  fragment CartApiMutation on Cart {
    id
    totalQuantity
    lines(first: 100) {
      nodes {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
          }
        }
      }
    }
  }
`;
