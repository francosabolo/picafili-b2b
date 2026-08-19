import {
  ACCOUNT_STATES,
  useAccountState,
} from '~/context/AccountStateContext.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import styles from './styles.module.scss';

/**
 * Banner de estado de cuenta. Es la pieza que comunica el privilegio: le dice
 * al usuario en qué punto del embudo está y qué le falta para ver precios.
 */
export function AccountStateBanner() {
  const {id} = useAccountState();
  const {t} = useTranslation();

  // Al aprobado no se le anuncia nada: que vea precios y pueda pedir **es** el
  // anuncio. El banner ocupaba el primer pliegue de cada página para repetir
  // algo que la pantalla ya demuestra, y encima arrastraba una línea con la
  // empresa y un `·` colgando de un grupo de precios que en B2B real no
  // existe. Los otros dos estados sí dicen algo que no se ve: qué falta.
  if (id === ACCOUNT_STATES.APPROVED || id === ACCOUNT_STATES.SALES_REP) {
    return null;
  }

  if (id === ACCOUNT_STATES.GUEST) {
    return (
      <div className={`${styles.banner} ${styles.bannerGuest}`}>
        <div>
          <strong className={styles.bannerTitle}>
            {t('account-state.guest-title')}
          </strong>
          <p>{t('account-state.guest-body')}</p>
        </div>
        <a className={styles.bannerCta} href="/pages/contact">
          {t('account-state.guest-cta')}
        </a>
      </div>
    );
  }

  if (id === ACCOUNT_STATES.PENDING) {
    return (
      <div className={`${styles.banner} ${styles.bannerPending}`}>
        <div>
          <strong className={styles.bannerTitle}>
            {t('account-state.pending-title')}
          </strong>
          <p>{t('account-state.pending-body')}</p>
        </div>
      </div>
    );
  }

  return null;
}
