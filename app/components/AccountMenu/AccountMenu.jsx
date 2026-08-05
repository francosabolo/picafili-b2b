import {NavLink} from '@remix-run/react';
import {Form} from '@remix-run/react';
import styles from './styles.module.scss';
import LogoutButton from '../LogoutButton/LogoutButton.jsx';
import {useTranslation} from '~/i18n/index.jsx';

export default function AccountMenu() {
  const {t} = useTranslation();
  function isActiveStyle({isActive, isPending}) {
    return {
      backgroundColor: isActive ? 'var(--color-grey-dark)' : undefined,
      color: isActive ? 'var(--color-light)' : 'var(--color-black)',
    };
  }

  return (
    <nav className={styles.accountMenu} role="navigation">
      <NavLink
        className={styles.menuPill}
        to="/account/orders"
        style={isActiveStyle}
      >
        <span>{t('account.orders')}</span>
      </NavLink>
      <NavLink
        className={styles.menuPill}
        to={'/account/quotes'}
        style={isActiveStyle}
      >
        <span>{t('account.quotes')}</span>
      </NavLink>
      <NavLink
        className={styles.menuPill}
        to="/account/profile"
        style={isActiveStyle}
      >
        <span>{t('account.profile')}</span>
      </NavLink>
      <NavLink
        className={styles.menuPill}
        to="/account/addresses"
        style={isActiveStyle}
      >
        <span>{t('account.addresses')}</span>
      </NavLink>
      <NavLink
        className={styles.menuPill}
        to="/blogs/wikiHER"
        style={isActiveStyle}
      >
        <span>{t('account.wiki')}</span>
      </NavLink>
      <div className={styles.menuPill__right}></div>
      <LogoutButton />
    </nav>
  );
}
