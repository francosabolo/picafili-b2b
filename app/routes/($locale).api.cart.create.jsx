import {json} from '@shopify/remix-oxygen';

// Fetch and return API data with a Remix loader function
export async function action({request, context}) {
  const {storefront} = context;
  const cart = await storefront.mutate(CART_CREATE_MUTATION, {
    variables: {
      cartInput: {
        // "lines": [
        //     {
        //         "quantity": 1,
        //         "merchandiseId": "gid://shopify/ProductVariant/123"
        //     }
        // ],
        // "attributes": {
        //     "key": "cart_attribute_key",
        //     "value": "This is a cart attribute value"
        // }
      },
    },
  });
  return json({cart});
}

// Query the API for a list of characters
const CART_CREATE_MUTATION = `#graphql
mutation createCart($cartInput: CartInput) {
  cartCreate(input: $cartInput) {
    cart {
      id
      createdAt
      updatedAt
      checkoutUrl
      lines(first: 10) {
        edges {
          node {
            id
            merchandise {
              ... on ProductVariant {
                id
              }
            }
          }
        }
      }
      attributes {
        key
        value
      }
      cost {
        totalAmount {
          amount
          currencyCode
        }
        subtotalAmount {
          amount
          currencyCode
        }
        totalTaxAmount {
          amount
          currencyCode
        }
        totalDutyAmount {
          amount
          currencyCode
        }
      }
    }
  }
}
`;
