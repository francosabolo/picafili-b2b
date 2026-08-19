import {json} from '@shopify/remix-oxygen';
import {Outlet, useLoaderData} from '@remix-run/react';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
import AccountMenu from '~/components/AccountMenu/AccountMenu';
import {useUser} from '~/context/UserContext.jsx';
import {useEffect, useState} from 'react';
import {useTranslation} from '~/i18n/index.jsx';

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

  // Acá había un gate por el tag `active` heredado del fork: sin ese tag, la
  // zona de cuenta entera se reemplazaba por un cartel que hablaba de "miembro
  // profesional HER" y mandaba a escribir a hello@powerb2x.com. En esta tienda
  // NADIE tiene ese tag, así que el cartel era lo único que veía cualquier
  // cliente que entrara a su cuenta — con la marca y el mail equivocados.
  //
  // No se reemplaza por otro gate: quién entra ya lo decidió
  // `app/lib/access.server.js` antes que Remix, y duplicar esa regla acá es
  // exactamente la forma de que las dos se desincronicen.

  const firstName = customer?.firstName || '';
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
