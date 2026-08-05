import {useFetcher} from '@remix-run/react';
import {useUser} from '~/context/UserContext';
import styles from '~/components/AccountMenu/styles.module.scss';

export default function LogoutButton() {
  const fetcher = useFetcher();
  const {clearUserData} = useUser();

  const handleLogout = async (event) => {
    clearUserData();
  };

  return (
    <fetcher.Form
      method="post"
      action="/account/logout"
      onSubmit={handleLogout}
    >
      <button type="submit" className={styles.accountLogoutBtn}>
        Logout
      </button>
    </fetcher.Form>
  );
}
