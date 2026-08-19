import {json} from '@shopify/remix-oxygen';
import {pageTitle} from '~/lib/utils.js';
import {
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from '@remix-run/react';
import {
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
  CREATE_ADDRESS_MUTATION,
} from '~/graphql/customer-account/CustomerAddressMutations';
import {useEffect, useState} from 'react';
import {IconSuccess, IconError, IconCaret} from '../components/Icon/Icon.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import styles from '~/styles/pages/Addresses.module.scss';

export const meta = ({matches}) => {
  return [{title: pageTitle(matches, 'page-title.addresses')}];
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

  try {
    const form = await request.formData();

    const addressId = form.has('addressId')
      ? String(form.get('addressId'))
      : null;
    if (!addressId) {
      throw new Error('You must provide an address id.');
    }

    // this will ensure redirecting to log-in never happen for mutation
    const isLoggedIn = await customerAccount.isLoggedIn();
    if (!isLoggedIn) {
      return json(
        {error: {[addressId]: 'Unauthorized'}},
        {
          status: 401,
        },
      );
    }

    const defaultAddress = form.has('defaultAddress')
      ? String(form.get('defaultAddress')) === 'on'
      : false;
    const address = {};
    const keys = [
      'address1',
      'address2',
      'city',
      'company',
      'territoryCode',
      'firstName',
      'lastName',
      'phoneNumber',
      'zoneCode',
      'zip',
    ];

    for (const key of keys) {
      const value = form.get(key);
      if (typeof value === 'string') {
        address[key] = value;
      }
    }

    switch (request.method) {
      case 'POST': {
        // handle new address creation
        try {
          const {data, errors} = await customerAccount.mutate(
            CREATE_ADDRESS_MUTATION,
            {
              variables: {address, defaultAddress},
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressCreate?.userErrors?.length) {
            throw new Error(data?.customerAddressCreate?.userErrors[0].message);
          }

          if (!data?.customerAddressCreate?.customerAddress) {
            throw new Error('Customer address create failed.');
          }

          return json({
            error: null,
            createdAddress: data?.customerAddressCreate?.customerAddress,
            defaultAddress,
          });
        } catch (error) {
          if (error instanceof Error) {
            return json(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return json(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'PUT': {
        // handle address updates
        try {
          const {data, errors} = await customerAccount.mutate(
            UPDATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                addressId: decodeURIComponent(addressId),
                defaultAddress,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressUpdate?.userErrors?.length) {
            throw new Error(data?.customerAddressUpdate?.userErrors[0].message);
          }

          if (!data?.customerAddressUpdate?.customerAddress) {
            throw new Error('Customer address update failed.');
          }

          return json({
            error: null,
            updatedAddress: address,
            defaultAddress,
          });
        } catch (error) {
          if (error instanceof Error) {
            return json(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return json(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'DELETE': {
        // handles address deletion
        try {
          const {data, errors} = await customerAccount.mutate(
            DELETE_ADDRESS_MUTATION,
            {
              variables: {addressId: decodeURIComponent(addressId)},
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressDelete?.userErrors?.length) {
            throw new Error(data?.customerAddressDelete?.userErrors[0].message);
          }

          if (!data?.customerAddressDelete?.deletedAddressId) {
            throw new Error('Customer address delete failed.');
          }

          return json({error: null, deletedAddress: addressId});
        } catch (error) {
          if (error instanceof Error) {
            return json(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return json({error: {[addressId]: error}}, {status: 400});
        }
      }

      default: {
        return json(
          {error: {[addressId]: 'Method not allowed'}},
          {
            status: 405,
          },
        );
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      return json(
        {error: error.message},
        {
          status: 400,
        },
      );
    }
    return json({error}, {status: 400});
  }
}

export default function Addresses() {
  const {t} = useTranslation();
  const {customer} = useOutletContext();
  const {defaultAddress, addresses} = customer;

  return (
    <div className="account-addresses">
      <br />
      {!addresses.nodes.length ? (
        <div className="emptyAddressWrapper">
          <p>{t('account.no-addresses')}</p>
          <div className="addressWrapper">
            <h2>
              <legend>{t('account.create-address')}</legend>
            </h2>
            <NewAddressForm />
          </div>
        </div>
      ) : (
        <div>
          <div className="addressWrapper">
            <ExistingAddresses
              addresses={addresses}
              defaultAddress={defaultAddress}
            />
          </div>
          <div className="addressWrapper">
            <h2>
              <legend>{t('account.create-address')}</legend>
            </h2>
            <NewAddressForm />
          </div>
        </div>
      )}
    </div>
  );
}

function NewAddressForm() {
  const {t} = useTranslation();
  const newAddress = {
    address1: '',
    address2: '',
    city: '',
    company: '',
    territoryCode: '',
    firstName: '',
    id: 'new',
    lastName: '',
    phoneNumber: '',
    zoneCode: '',
    zip: '',
  };

  return (
    <AddressForm
      addressId={'NEW_ADDRESS_ID'}
      address={newAddress}
      defaultAddress={null}
      editMode={false}
    >
      {({stateForMethod}) => (
        <div>
          <button
            disabled={stateForMethod('POST') !== 'idle'}
            formMethod="POST"
            type="submit"
            className="accountBtnSubmit"
          >
            {stateForMethod('POST') !== 'idle'
              ? t('account.creating')
              : t('account.create')}
          </button>
        </div>
      )}
    </AddressForm>
  );
}

/**
 * @param {Pick<CustomerFragment, 'addresses' | 'defaultAddress'>}
 */
function ExistingAddresses({addresses, defaultAddress}) {
  const {t} = useTranslation();
  return (
    <div>
      <h2>
        <legend>{t('account.existing-addresses')}</legend>
      </h2>
      {addresses.nodes.map((address) => (
        <AddressForm
          key={address.id}
          addressId={address.id}
          address={address}
          defaultAddress={defaultAddress}
          editMode={true}
        >
          {({stateForMethod}) => (
            <div className="addressBtnContainer">
              <button
                disabled={stateForMethod('DELETE') !== 'idle'}
                formMethod="DELETE"
                type="submit"
                className="accountBtnSubmit"
              >
                {stateForMethod('DELETE') !== 'idle' ? 'Deleting' : 'Delete'}
              </button>
              <button
                disabled={stateForMethod('PUT') !== 'idle'}
                formMethod="PUT"
                type="submit"
                className="accountBtnSubmit"
              >
                {stateForMethod('PUT') !== 'idle' ? 'Saving' : 'Save'}
              </button>
            </div>
          )}
        </AddressForm>
      ))}
    </div>
  );
}

/**
 *
 * @param addressId
 * @param address
 * @param defaultAddress
 * @param editMode
 * @param children
 * @returns {JSX.Element}
 * @constructor
 */
export function AddressForm({
  addressId,
  address,
  defaultAddress,
  editMode,
  children,
}) {
  const {t} = useTranslation();
  const {state, formMethod} = useNavigation();
  /** @type {ActionReturnData} */
  const action = useActionData();
  const [message, setMessage] = useState(false);
  const [isFormVisible, setFormVisible] = useState(!editMode);
  const error = action?.error?.[addressId];

  useEffect(() => {
    if (action) {
      setMessage(true);
      setTimeout(() => {
        setMessage(false);
      }, 5000);
    }
  }, [action]);

  const isDefaultAddress = defaultAddress?.id === addressId;

  return (
    <>
      {editMode && (
        <div className="extensibleTab">
          <div>
            {address.city}, {address.zoneCode} - {address.address1}{' '}
            {address.address2}
          </div>
          <button onClick={() => setFormVisible(!isFormVisible)}>
            <span>
              <IconCaret direction={isFormVisible ? 'up' : 'down'} />
            </span>
          </button>
        </div>
      )}
      {isFormVisible && (
        <Form id={addressId}>
          <fieldset>
            <input type="hidden" name="addressId" defaultValue={addressId} />
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="firstName">
                  {t('account.first-name')}*
                </label>
                <input
                  className={styles.input}
                  aria-label={t('account.first-name')}
                  autoComplete="given-name"
                  defaultValue={address?.firstName ?? ''}
                  id="firstName"
                  name="firstName"
                  placeholder={t('account.first-name')}
                  required
                  type="text"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="lastName">
                  {t('account.last-name')}*
                </label>
                <input
                  className={styles.input}
                  aria-label={t('account.last-name')}
                  autoComplete="family-name"
                  defaultValue={address?.lastName ?? ''}
                  id="lastName"
                  name="lastName"
                  placeholder={t('account.last-name')}
                  required
                  type="text"
                />
              </div>
              <div className={`${styles.field} ${styles.wide}`}>
                <label className={styles.label} htmlFor="company">
                  {t('account.company')}
                </label>
                <input
                  className={styles.input}
                  aria-label={t('account.company')}
                  autoComplete="organization"
                  defaultValue={address?.company ?? ''}
                  id="company"
                  name="company"
                  placeholder={t('account.company')}
                  type="text"
                />
              </div>
              <div className={`${styles.field} ${styles.wide}`}>
                <label className={styles.label} htmlFor="address1">
                  {t('account.address-1')}*
                </label>
                <input
                  className={styles.input}
                  aria-label={t('account.address-1')}
                  autoComplete="address-line1"
                  defaultValue={address?.address1 ?? ''}
                  id="address1"
                  name="address1"
                  placeholder={t('account.address-1')}
                  required
                  type="text"
                />
              </div>
              <div className={`${styles.field} ${styles.wide}`}>
                <label className={styles.label} htmlFor="address2">
                  {t('account.address-2')}
                </label>
                <input
                  className={styles.input}
                  aria-label={t('account.address-2')}
                  autoComplete="address-line2"
                  defaultValue={address?.address2 ?? ''}
                  id="address2"
                  name="address2"
                  placeholder={t('account.address-2')}
                  type="text"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="city">
                  {t('account.city')}*
                </label>
                <input
                  className={styles.input}
                  aria-label={t('account.city')}
                  autoComplete="address-level2"
                  defaultValue={address?.city ?? ''}
                  id="city"
                  name="city"
                  placeholder={t('account.city')}
                  required
                  type="text"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="zoneCode">
                  {t('account.province')}*
                </label>
                <input
                  className={styles.input}
                  aria-label={t('account.province')}
                  autoComplete="address-level1"
                  defaultValue={address?.zoneCode ?? ''}
                  id="zoneCode"
                  name="zoneCode"
                  placeholder={t('account.province')}
                  required
                  type="text"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="zip">
                  {t('account.zip')}*
                </label>
                <input
                  className={styles.input}
                  aria-label={t('account.zip')}
                  autoComplete="postal-code"
                  defaultValue={address?.zip ?? ''}
                  id="zip"
                  name="zip"
                  placeholder={t('account.zip')}
                  required
                  type="text"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="territoryCode">
                  {t('account.country')}*
                </label>
                <input
                  className={styles.input}
                  aria-label={t('account.country')}
                  autoComplete="country"
                  defaultValue={address?.territoryCode ?? ''}
                  id="territoryCode"
                  name="territoryCode"
                  placeholder={t('account.country')}
                  required
                  type="text"
                  maxLength={2}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="phoneNumber">
                  {t('account.phone')}
                </label>
                <input
                  className={styles.input}
                  aria-label={t('account.phone')}
                  autoComplete="tel"
                  defaultValue={address?.phoneNumber ?? ''}
                  id="phoneNumber"
                  name="phoneNumber"
                  placeholder="+16135551111"
                  pattern="^\+?[1-9]\d{3,14}$"
                  type="tel"
                />
              </div>
            </div>
            <div className={styles.checkboxRow}>
              <input
                defaultChecked={isDefaultAddress}
                id="defaultAddress"
                name="defaultAddress"
                type="checkbox"
              />
              <label className={styles.label} htmlFor="defaultAddress">
                {t('account.set-default')}
              </label>
            </div>
            {error && message ? (
              <a className="message error">
                <IconError></IconError>
                {error}
              </a>
            ) : (
              message && (
                <a className="message success">
                  <IconSuccess className="icon"></IconSuccess>
                  {t('account.profile-updated')}
                </a>
              )
            )}
            {children({
              stateForMethod: (method) =>
                formMethod === method ? state : 'idle',
            })}
          </fieldset>
        </Form>
      )}
    </>
  );
}

/**
 * @typedef {{
 *   addressId?: string | null;
 *   createdAddress?: AddressFragment;
 *   defaultAddress?: string | null;
 *   deletedAddress?: string | null;
 *   error: Record<AddressFragment['id'], string> | null;
 *   updatedAddress?: AddressFragment;
 * }} ActionResponse
 */

/** @typedef {import('@shopify/hydrogen/customer-account-api-types').CustomerAddressInput} CustomerAddressInput */
/** @typedef {import('customer-accountapi.generated').AddressFragment} AddressFragment */
/** @typedef {import('customer-accountapi.generated').CustomerFragment} CustomerFragment */
/** @typedef {import('@shopify/remix-oxygen').ActionFunctionArgs} ActionFunctionArgs */
/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */
