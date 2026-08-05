import {json} from '@shopify/remix-oxygen';

/**
 * This function is a Remix action that fetches and returns cart data from the Shopify API.
 * It extracts the cartId from the request body, constructs a GraphQL query, and sends the query to the Shopify API.
 * The result is returned as a JSON response.
 *
 * @param {Object} context - The context object provided by Remix.
 * @param {Object} request - The request object provided by Remix.
 * @returns {Promise} - A promise that resolves with a JSON response containing the cart data.
 */
export async function action({request, context}) {
  const {storefront} = context;
  const requestBody = await request.json();
  // Extract the cartId from the body
  const cartId = 'gid://shopify/Cart/' + requestBody.cartId;

  const cart = await storefront.query(CART_QUERY, {
    variables: {
      cartId: cartId,
    },
  });
  return json({cart});
}

/**
 * This is a GraphQL query that fetches a cart by its ID from the Shopify API.
 * It fetches the cart's ID, creation and update timestamps, checkout URL, line items, attributes, cost, and buyer identity.
 * The line items and attributes are fetched as lists, with each item having its own ID, quantity, merchandise, and attributes.
 * The cost is fetched as a total amount, subtotal amount, total tax amount, and total duty amount, each with its own amount and currency code.
 * The buyer identity is fetched as an email, phone, customer ID, and country code.
 */
const CART_QUERY = `#graphql
query cartQuery($cartId: ID!) {
    cart(id: $cartId) {
        id
        createdAt
        updatedAt
        checkoutUrl
        lines(first: 10) {
            edges {
                node {
                    id
                    quantity
                    merchandise {
                        ... on ProductVariant {
                            id
                        }
                    }
                    attributes {
                        key
                        value
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
        buyerIdentity {
            email
            phone
            customer {
                id
            }
            countryCode
        }
    }
}
`;
