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
  const {id, company, priceList} = useAccountState();
  const {t} = useTranslation();

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

  return (
    <div className={`${styles.banner} ${styles.bannerApproved}`}>
      <div>
        <strong className={styles.bannerTitle}>
          {t('account-state.approved-title')}
        </strong>
        {/* La empresa y el grupo van en su propia línea y no embebidos en la
            frase: metidos en el texto obligaban a partir la oración para poder
            destacar el grupo en negrita, y una frase partida no se traduce. */}
        <p className={styles.bannerMeta}>
          {company} · <strong>{priceList}</strong>
        </p>
        <p>{t('account-state.approved-body')}</p>
      </div>
    </div>
  );
}
