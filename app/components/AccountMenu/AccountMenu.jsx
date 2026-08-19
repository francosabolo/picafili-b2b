import {NavLink} from '@remix-run/react';
import {Form} from '@remix-run/react';
import styles from './styles.module.scss';
import LogoutButton from '../LogoutButton/LogoutButton.jsx';
import {useTranslation} from '~/i18n/index.jsx';

export default function AccountMenu() {
  const {t} = useTranslation();
  // El estado activo lo marca el CSS con `aria-current`, que NavLink pone solo.
  // Antes venía por estilo inline con colores del fork —gris oscuro sobre
  // blanco— y encima ganaba siempre: cualquier cambio de diseño en la hoja de
  // estilos no tenía efecto.

  return (
    <nav className={styles.accountMenu} role="navigation">
      <NavLink className={styles.menuPill} to="/account/orders">
        <span>{t('account.orders')}</span>
      </NavLink>
      <NavLink className={styles.menuPill} to={'/account/quotes'}>
        <span>{t('account.quotes')}</span>
      </NavLink>
      <NavLink className={styles.menuPill} to="/account/profile">
        <span>{t('account.profile')}</span>
      </NavLink>
      <NavLink className={styles.menuPill} to="/account/addresses">
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
