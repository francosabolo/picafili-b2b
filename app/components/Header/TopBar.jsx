import {useTranslation} from '~/i18n/index.jsx';
import styles from '~/components/Header/styles.module.scss';

/**
 *   menu: HeaderProps['header']['menu'];
 *   primaryDomainUrl: HeaderQuery['shop']['primaryDomain']['url'];
 *   viewport: Viewport;
 * }}
 */
export function TopBar() {
  const {t} = useTranslation();

  return (
    <div className={styles.topBar}>
      <div className={styles.topBarContent}>
        <div className={styles.topBarContentItem}>
          <span>{t('general.welcome')}</span>
        </div>
      </div>
    </div>
  );
}
