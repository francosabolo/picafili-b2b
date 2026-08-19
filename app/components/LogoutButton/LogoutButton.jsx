import {useFetcher} from '@remix-run/react';
import {useUser} from '~/context/UserContext';
import styles from '~/components/AccountMenu/styles.module.scss';
import {useTranslation} from '~/i18n/index.jsx';

export default function LogoutButton() {
  const fetcher = useFetcher();
  const {clearUserData} = useUser();
  const {t} = useTranslation();

  const handleLogout = async (event) => {
    clearUserData();
  };

  return (
    <fetcher.Form
      method="post"
      action="/account/logout"
      onSubmit={handleLogout}
    >
      {/* Botón con borde y no un link subrayado suelto: era la única acción
          del menú que no parecía accionable, en castellano además. Cerrar
          sesión no es la acción principal de la pantalla, pero tiene que
          encontrarse a la primera. */}
      <button type="submit" className={styles.accountLogoutBtn}>
        {t('account.logout')}
      </button>
    </fetcher.Form>
  );
}
