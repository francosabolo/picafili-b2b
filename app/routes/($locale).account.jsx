import {json} from '@shopify/remix-oxygen';
import {Outlet, useLoaderData} from '@remix-run/react';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
import AccountMenu from '~/components/AccountMenu/AccountMenu';
import {useUser} from '~/context/UserContext.jsx';
import {useEffect, useState} from 'react';
import {useTranslation} from '~/i18n/index.jsx';
import LogoutButton from '../components/LogoutButton/LogoutButton';

export const handle = 'account';

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, context}) {
  const {data, errors} = await context.customerAccount.query(
    CUSTOMER_DETAILS_QUERY,
  );

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  const {customer} = data;

  return json(
    {
      customer: customer,
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

export default function AccountLayout() {
  /** @type {LoaderReturnData} */
  const {customer} = useLoaderData();
  const {t} = useTranslation();
  const {setUserData} = useUser();

  useEffect(() => {
    setUserData(customer);
  }, []);

  if (!customer?.tags?.includes('active')) {
    return (
      <div className="account page-width">
        <div className="customerInactiveMenu">
          <LogoutButton />
          <div className="customerInactiveMessage">
            <h3>{t('account.inactive-message-title')}</h3>
            <p>{t('account.inactive-message')}</p>
          </div>
        </div>
      </div>
    );
  }

  const firstName = customer?.firstName || 'HerLighter';
  const heading = customer
    ? customer?.firstName
      ? `${t('account.welcome')} ${firstName} !`
      : t('account.welcome-to-account')
    : t('account.details');

  return (
    <div className="account page-width">
      <h1 className="account-heading">{heading}</h1>
      <AccountMenu />
      <Outlet context={{customer}} />
    </div>
  );
}

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
