import {Await} from '@remix-run/react';
import {Suspense} from 'react';
import {CartForm} from '@shopify/hydrogen';
import {json} from '@shopify/remix-oxygen';
import {CartMain} from '~/components/Cart/Cart.jsx';
import {useRootLoaderData} from '~/lib/root-data';
import {pageTitle} from '~/lib/utils.js';
import {useTranslation} from '~/i18n/index.jsx';

/**
 * @type {MetaFunction}
 */
export const meta = ({matches}) => {
  return [{title: pageTitle(matches, 'page-title.cart')}];
};

/**
 * @param {ActionFunctionArgs}
 */
export async function action({request, context}) {
  const {cart} = context;

  const formData = await request.formData();
  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;

      // User inputted discount code
      const discountCodes = formDiscountCode ? [formDiscountCode] : [];

      // Combine discount codes already applied on cart
      discountCodes.push(...inputs.discountCodes);

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  // Shopify puede rechazar una mutación y devolver `cart: null` con los
  // motivos adentro de `errors`. Leer `result.cart.id` en ese caso lanzaba, y
  // la acción respondía **500 sin decir nada**: el comprador veía "Algo falló
  // de nuestro lado" y en el log no quedaba la causa. Un rechazo del carrito es
  // un resultado posible, no un error del servidor.
  if (!result?.cart?.id) {
    // eslint-disable-next-line no-console
    console.error(
      `[cart] ${action} sin carrito en la respuesta:`,
      JSON.stringify(result?.errors ?? result),
    );

    return json(
      {
        cart: null,
        errors: result?.errors?.length
          ? result.errors
          : [{message: 'Shopify no devolvió el carrito'}],
      },
      {status: 400},
    );
  }

  const cartId = result.cart.id;
  const headers = cart.setCartId(result.cart.id);
  const {cart: cartResult, errors} = result;

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  // let hydroCartId = function(){
  //   var id = result.cart.id;
  //   var index = id.lastIndexOf('?');
  //   id = id.substring(0, index);
  //   return id
  // }

  headers.append('Set-Cookie', await context.session.commit());
  // headers.append('Set-Cookie', 'toniCart=' +  hydroCartId().replace('gid://shopify/Cart/','') + '; path=/; domain=.wearetonica.com');

  return json(
    {
      cart: cartResult,
      errors,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
}

export default function Cart() {
  const {t} = useTranslation();
  const rootData = useRootLoaderData();
  const cartPromise = rootData.cart;

  return (
    <div className="cart">
      <h1>{t('cart.title')}</h1>
      <Suspense fallback={<p>{t('orders.loading')}</p>}>
        <Await
          resolve={cartPromise}
          errorElement={<div>An error occurred</div>}
        >
          {(cart) => {
            return <CartMain layout="page" cart={cart} />;
          }}
        </Await>
      </Suspense>
    </div>
  );
}

/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */
/** @typedef {import('@shopify/hydrogen').CartQueryDataReturn} CartQueryDataReturn */
/** @typedef {import('@shopify/remix-oxygen').ActionFunctionArgs} ActionFunctionArgs */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */
