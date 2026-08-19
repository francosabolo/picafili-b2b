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
      {/* Acá había un link a `/blogs/wikiHER` — la wiki de la marca del fork,
          un blog que esta tienda no tiene: llevaba a un 404 desde el menú de
          cuenta de todos los clientes. */}
      <div className={styles.menuPill__right}></div>
      <LogoutButton />
    </nav>
  );
}
