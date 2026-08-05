import {json} from '@shopify/remix-oxygen';

/**
 * This function is a Remix action that updates the buyer identity of a cart in the Shopify API.
 * It extracts the cartId, email, and phone from the request body, constructs a GraphQL mutation, and sends the mutation to the Shopify API.
 * The result is returned as a JSON response.
 *
 * @param {Object} context - The context object provided by Remix.
 * @param {Object} request - The request object provided by Remix. The request body should be a JSON object with the following structure:
 * {
 *   "cartId" : "Z2NwLXVzLWVhc3QxOjAxSFpKNEhINFQ5RDBDODBHUVBaWVhSMk4x", // The ID of the cart to update
 *   "email": "francosabolo@gmail.com", // The email of the buyer
 *   "phone": "+543413244752" // The phone number of the buyer
 * }
 * @returns {Promise} - A promise that resolves with a JSON response containing the updated cart data.
 */
export async function action({request, context}) {
  const {storefront} = context;
  const requestBody = await request.json();
  // Extract the cartId from the body
  const cartId = 'gid://shopify/Cart/' + requestBody.cartId;

  const cart = await storefront.mutate(MUTATION_UPDATE_BUYER_IDENTITY, {
    variables: {
      buyerIdentity: {
        email: requestBody.email,
        phone: requestBody.phone,
        countryCode: requestBody.countryCode,
      },
      cartId: cartId,
    },
  });
  return json({cart});
}

/**
 * This is a GraphQL mutation that updates the buyer identity of a cart in the Shopify API.
 * It updates the email, phone, and delivery address preferences of the buyer identity, and returns the updated cart data.
 * The updated cart data includes the cart's ID and the updated buyer identity.
 * The buyer identity includes the email, phone, and delivery address preferences.
 * The delivery address preferences are returned as a MailingAddress object, which includes the address, city, country, first name, and last name.
 */
const MUTATION_UPDATE_BUYER_IDENTITY = `#graphql
mutation updateCartBuyerIdentity($buyerIdentity: CartBuyerIdentityInput!, $cartId: ID!) {
    cartBuyerIdentityUpdate(buyerIdentity: $buyerIdentity, cartId: $cartId) {
        cart {
            id
            buyerIdentity {
                email
                phone
                deliveryAddressPreferences {
                    ... on MailingAddress {
                        address1
                        city
                        country
                        firstName
                        lastName
                    }
                }
            }
        }
        userErrors {
            field
            message
        }
    }
}
`;
