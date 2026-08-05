import {Link, useLoaderData} from '@remix-run/react';
import {pageTitle} from '~/lib/utils.js';
import {
  Money,
  Pagination,
  getPaginationVariables,
  flattenConnection,
} from '@shopify/hydrogen';
import {json} from '@shopify/remix-oxygen';
import {CUSTOMER_DRAFT_ORDERS_QUERY} from '~/graphql/customer-account/CustomerDraftOrdersQuery';
import QuoteTable from '~/components/QuoteTable/QuoteTable';

/**
 * @type {MetaFunction}
 */
export const meta = ({matches}) => {
  return [{title: pageTitle(matches, 'page-title.quotes')}];
};

export const handle = 'account';

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, context}) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const {data, errors} = await context.customerAccount.query(
    CUSTOMER_DRAFT_ORDERS_QUERY,
    {
      variables: {
        ...paginationVariables,
      },
    },
  );

  if (errors?.length || !data?.customer) {
    throw Error('Customer quotes not found');
  }

  return json({customer: data.customer});
}

export default function Quotes() {
  /** @type {LoaderReturnData} */
  const {customer} = useLoaderData();
  const {draftOrders} = customer;

  return (
    <div className="orders">
      {draftOrders?.nodes?.length ? (
        <QuoteTable draftOrders={draftOrders} />
      ) : (
        <EmptyDraftOrders />
      )}
    </div>
  );
}

function EmptyDraftOrders() {
  return (
    <div>
      <p>You haven&apos;t placed any quotes yet.</p>
      <br />
      <p>
        <Link to="/collections">Start Shopping →</Link>
      </p>
    </div>
  );
}
