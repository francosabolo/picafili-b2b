import {json, redirect} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {CUSTOMER_DRAFT_ORDER_QUERY} from '~/graphql/customer-account/CustomerDraftOrderQuery.js';
import QuoteView from '~/components/QuoteView/QuoteView.jsx';
import {pageTitle} from '~/lib/utils.js';

/**
 * @type {MetaFunction<typeof loader>}
 */
export const meta = ({data, matches}) => {
  return [
    {
      title: pageTitle(
        matches,
        `${data?.order?.name ?? ''}`.trim() || 'page-title.quote',
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
    return redirect('/account/quotes');
  }

  const id = atob(params.id);
  const {data, errors} = await context.customerAccount.query(
    CUSTOMER_DRAFT_ORDER_QUERY,
    {
      variables: {id},
    },
  );

  if (errors?.length || !data?.draftOrder) {
    throw new Error('Quote not found');
  }

  const {draftOrder} = data;
  return json(
    {
      draftOrder,
    },
    {},
  );
}

export default function QuoteRoute() {
  /** @type {LoaderReturnData} */
  const {draftOrder} = useLoaderData();
  return <QuoteView draftOrder={draftOrder} />;
}

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */
/** @typedef {import('customer-accountapi.generated').OrderLineItemFullFragment} OrderLineItemFullFragment */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
