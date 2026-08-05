import {redirect} from '@shopify/remix-oxygen';
import invariant from 'tiny-invariant';
import {locales} from '~/data/locales.js';

export const action = async ({request, context}) => {
  const {session} = context;
  const formData = await request.formData();
  const defaultLanguageCode = 'EN';

  // Make sure the form request is valid
  const languageCode = formData.get('language');

  invariant(languageCode, 'Missing language');

  const countryCode = formData.get('country');
  invariant(countryCode, 'Missing country');

  const currentPath = formData.get('currentPath');
  const newLocale = locales[`/` + languageCode.toLowerCase()];
  const cartId = await session.get('cartId');

  // Update cart buyer's country code if there is a cart id
  if (cartId) {
    await updateCartBuyerIdentity(context, {
      cartId,
      buyerIdentity: {
        countryCode,
      },
    });
  }

  // remove language from the current path with regex
  let currentPathWithoutLocale = currentPath.replace(/^\/[a-z]{2}\//, '/');

  // Redirect to the new locale (only a)
  const redirectUrl = new URL(
    `${
      languageCode === defaultLanguageCode ? '' : newLocale.pathPrefix || ''
    }${currentPathWithoutLocale}`,
    request.url,
  );

  return redirect(redirectUrl, 302);
};

const UPDATE_CART_BUYER_COUNTRY = `#graphql
mutation CartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
    $country: CountryCode = ZZ
) @inContext(country: $country) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
        cart {
            id
        }
    }
}`;

async function updateCartBuyerIdentity({storefront}, {cartId, buyerIdentity}) {
  const data = await storefront.mutate(UPDATE_CART_BUYER_COUNTRY, {
    variables: {
      cartId,
      buyerIdentity,
    },
  });
}
