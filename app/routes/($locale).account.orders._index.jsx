import {Link, useLoaderData} from '@remix-run/react';
import {pageTitle} from '~/lib/utils.js';
import OrdersTable from '~/components/OrdersTable/OrdersTable';
import {getPaginationVariables} from '@shopify/hydrogen';
import {json} from '@shopify/remix-oxygen';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';

export const handle = 'account';
/**
 * @type {MetaFunction}
 */
export const meta = ({matches}) => {
  return [{title: pageTitle(matches, 'page-title.orders')}];
};

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, context}) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const {data, errors} = await context.customerAccount.query(
    CUSTOMER_ORDERS_QUERY,
    {
      variables: {
        ...paginationVariables,
      },
    },
  );

  if (errors?.length || !data?.customer) {
    throw Error('Customer orders not found');
  }

  return json({customer: data?.customer});
}

export default function Orders() {
  /** @type {LoaderReturnData} */
  const {customer} = useLoaderData();
  const {orders} = customer;
  return (
    <div className="orders">
      {orders.nodes.length ? <OrdersTable orders={orders} /> : <EmptyOrders />}
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="page-width">
      <p>You haven&apos;t placed any orders yet.</p>
      <br />
      <p>
        <Link to="/collections">Start Shopping →</Link>
      </p>
    </div>
  );
}

/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */
/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @typedef {import('customer-accountapi.generated').CustomerOrdersFragment} CustomerOrdersFragment */
/** @typedef {import('customer-accountapi.generated').OrderItemFragment} OrderItemFragment */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
