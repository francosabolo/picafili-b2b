import {json} from '@shopify/remix-oxygen';

export async function action({request, context}) {
  const {storefront} = context;
  const requestBody = await request.json();
  // Extract the cartId from the body
  const cartId = 'gid://shopify/Cart/' + requestBody.cartId;

  const cart = await storefront.query(CART_CHECKOUT_URL_QUERY, {
    variables: {
      cartId: cartId,
    },
  });
  return json({cart});
}

const CART_CHECKOUT_URL_QUERY = `#graphql
query checkoutURL($cartId: ID!) {
    cart(id: $cartId) {
        checkoutUrl
    }
}
`;
