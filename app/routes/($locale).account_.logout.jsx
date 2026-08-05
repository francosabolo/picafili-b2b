import {redirect} from '@shopify/remix-oxygen';
import {pageTitle} from '~/lib/utils.js';

export const meta = ({matches}) => {
  return [{title: pageTitle(matches, 'page-title.logout')}];
};

export async function loader({request, context}) {
  return redirect('/');
}

export async function action({request, context}) {
  const {session} = context;
  session.unset('customerAccessToken');
  session.unset('userData');

  await context.customerAccount.logout();

  return redirect('/');
}

/** @typedef {import('@shopify/remix-oxygen').ActionFunctionArgs} ActionFunctionArgs */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */
