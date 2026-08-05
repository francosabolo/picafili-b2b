import {json, redirect} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {flattenConnection} from '@shopify/hydrogen';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';
import OrderView from '~/components/OrderView/OrderView';
import {pageTitle} from '~/lib/utils.js';

/**
 * @type {MetaFunction<typeof loader>}
 */
export const meta = ({data, matches}) => {
  return [
    {
      title: pageTitle(
        matches,
        `${data?.order?.name ?? ''}`.trim() || 'page-title.order',
      ),
    },
  ];
};

export const handle = 'account';

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({params, context, request}) {
  if (!params.id) {
    return redirect('/account/orders');
  }

  const orderId = atob(params.id);
  const {data, errors} = await context.customerAccount.query(
    CUSTOMER_ORDER_QUERY,
    {
      variables: {orderId},
    },
  );

  if (errors?.length || !data?.order) {
    throw new Error('Order not found');
  }

  const {order} = data;

  const lineItems = flattenConnection(order.lineItems);
  const discountApplications = flattenConnection(order.discountApplications);
  const fulfillmentStatus = flattenConnection(order.fulfillments)[0]?.status;

  const firstDiscount = discountApplications[0]?.value;

  const discountValue =
    firstDiscount?.__typename === 'MoneyV2' && firstDiscount;

  const discountPercentage =
    firstDiscount?.__typename === 'PricingPercentageValue' &&
    firstDiscount?.percentage;

  return json({
    order,
  });
}

export default function OrderRoute() {
  /** @type {LoaderReturnData} */
  const {order} = useLoaderData();
  return <OrderView order={order}></OrderView>;
}

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */
/** @typedef {import('customer-accountapi.generated').OrderLineItemFullFragment} OrderLineItemFullFragment */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
