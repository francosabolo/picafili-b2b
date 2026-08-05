import {NavLink} from '@remix-run/react';
import {Form} from '@remix-run/react';
import styles from './styles.module.scss';
import LogoutButton from '../LogoutButton/LogoutButton.jsx';
import useLabelAnimation from '../../hooks/useLabelAnimation.jsx';
import {useTranslation} from '~/i18n/index.jsx';

export default function AccountProfileForm({customer}) {
  const {handleFocus, handleBlur} = useLabelAnimation();
  const {t} = useTranslation();

  return (
    <fieldset>
      <div className={`field ${customer.firstName ? 'active' : ''}`}>
        <label htmlFor="firstName" className={customer.firstName ?? ''}>
          {t('account.first-name')}
        </label>
        <input
          id="firstName"
          name="firstName"
          type="text"
          autoComplete="given-name"
          placeholder={t('account.first-name')}
          aria-label={t('account.first-name')}
          defaultValue={customer.firstName ?? ''}
          minLength={2}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
      <div className={`field ${customer.lastName ? 'active' : ''}`}>
        <label htmlFor="lastName">{t('account.last-name')}</label>
        <input
          id="lastName"
          name="lastName"
          type="text"
          autoComplete="family-name"
          placeholder={t('account.last-name')}
          aria-label={t('account.last-name')}
          defaultValue={customer.lastName ?? ''}
          minLength={2}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
    </fieldset>
  );
}
