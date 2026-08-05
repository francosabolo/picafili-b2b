import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
import {pageTitle} from '~/lib/utils.js';
import {json} from '@shopify/remix-oxygen';
import {
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from '@remix-run/react';
import AccountProfileForm from '../components/AccountProfileForm/AccountProfileForm';
import {useTranslation} from '~/i18n/index.jsx';
import {useEffect, useState} from 'react';
import {IconSuccess, IconError} from '../components/Icon/Icon.jsx';
/**
 * @type {MetaFunction}
 */
export const meta = ({matches}) => {
  return [{title: pageTitle(matches, 'page-title.profile')}];
};

export const handle = 'account';

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({context}) {
  await context.customerAccount.handleAuthStatus();

  return json({});
}

/**
 * @param {ActionFunctionArgs}
 */
export async function action({request, context}) {
  const {customerAccount} = context;

  if (request.method !== 'PUT') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  const form = await request.formData();

  try {
    const customer = {};
    const validInputKeys = ['firstName', 'lastName'];
    for (const [key, value] of form.entries()) {
      if (!validInputKeys.includes(key)) {
        continue;
      }
      if (typeof value === 'string' && value.length) {
        customer[key] = value;
      }
    }

    // update customer and possibly password
    const {data, errors} = await customerAccount.mutate(
      CUSTOMER_UPDATE_MUTATION,
      {
        variables: {
          customer,
        },
      },
    );

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    if (!data?.customerUpdate?.customer) {
      throw new Error('Customer profile update failed.');
    }

    return json({
      error: null,
      customer: data?.customerUpdate?.customer,
    });
  } catch (error) {
    return json({error: error.message, customer: null}, {status: 400});
  }
}

export default function AccountProfile() {
  const account = useOutletContext();
  const {state} = useNavigation();
  /** @type {ActionReturnData} */
  const action = useActionData();
  const [message, setMessage] = useState(false);
  const {t} = useTranslation();

  useEffect(() => {
    if (action && !action?.error) {
      setMessage(true);

      setTimeout(() => {
        setMessage(false);
      }, 5000);
      // Si quieres que la animación dure un cierto tiempo, puedes usar un timeout
    }
  }, [action]);

  const customer = action?.customer ?? account?.customer;

  return (
    <div className="account-profile">
      <h2>My profile</h2>
      <br />

      <Form method="PUT">
        <AccountProfileForm customer={customer} />
        {action && action?.error ? (
          <a className="message error">{action.error}</a>
        ) : (
          message && (
            <a className="message success">
              <IconSuccess className="icon"></IconSuccess>
              {t('Profile updated')}
            </a>
          )
        )}
        {!message && (
          <button
            type="submit"
            className="accountBtnSubmit"
            disabled={state !== 'idle'}
          >
            {state !== 'idle' ? 'Updating' : 'Update'}
          </button>
        )}
      </Form>
    </div>
  );
}

/**
 * @typedef {{
 *   error: string | null;
 *   customer: CustomerFragment | null;
 * }} ActionResponse
 */

/** @typedef {import('customer-accountapi.generated').CustomerFragment} CustomerFragment */
/** @typedef {import('@shopify/hydrogen/customer-account-api-types').CustomerUpdateInput} CustomerUpdateInput */
/** @typedef {import('@shopify/remix-oxygen').ActionFunctionArgs} ActionFunctionArgs */
/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */
