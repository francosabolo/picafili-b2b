import {useConsultList} from '~/context/ConsutListContext';
import {IconQuestionMark, IconXMark} from '../Icon/Icon';
import {useTranslation} from '~/i18n/index.jsx';
import styles from './styles.module.scss';
import {Link} from '@remix-run/react';
import {useRootLoaderData} from '~/lib/root-data.js';
import Cookies from 'js-cookie';

export function ConsultButton({viewport, product}) {
  const {addProduct, deleteProduct, isAlreadyIn} = useConsultList();
  const isAdded = isAlreadyIn(product);
  const {t} = useTranslation();

  function isAddedStyle() {
    if (isAdded)
      return {
        '--color-bg': 'var(--color-red)',
        '--color': 'white',
        '--color-border': 'var(--color-red)',
      };
  }

  function addDeleteTrigger() {
    if (isAdded) deleteProduct(product);
    else addProduct(product);
  }

  function MobileButton() {
    return isAdded ? (
      <span>
        <IconXMark viewBox="8 2 8 20" className={'w-5 h-5'} />
      </span>
    ) : (
      '+'
    );
  }

  function DesktopButton() {
    return isAdded ? (
      <span>
        <IconXMark viewBox="8 2 8 20" className={'w-5 h-5'} />
      </span>
    ) : (
      <span>{t('general.consult')}</span>
    );
  }

  return (
    <button
      className={`${styles.signInButton} ${styles.contactButton}`}
      onClick={() => addDeleteTrigger()}
      style={isAddedStyle()}
    >
      {viewport === 'mobile' ? <MobileButton /> : <DesktopButton />}
    </button>
  );
}

export function ConsultTooltip() {
  const {i18n} = useRootLoaderData();
  const {t} = useTranslation();
  const {publicStoreDomain} = useRootLoaderData();
  // const publicStoreDomain = 'localhost:9292';

  const selectedLocale = {
    prefix: i18n?.pathPrefix,
    isDefault: i18n?.isDefault,
  };
  const languagePath =
    selectedLocale.prefix === '/en' ? '' : selectedLocale.prefix;

  const {getConsultProducts, clearConsultProducts} = useConsultList();
  const consultList = getConsultProducts();

  let skuList = '';
  let titlesList = '';

  consultList.map((element, index) => {
    const separator = index < consultList.length - 1 ? '/' : '';

    skuList += `${element.sku}${separator}`;
    titlesList += `${element.title}${separator}`;
  });

  const contactURL = `https://${publicStoreDomain}${languagePath}/pages/contact?sku=${skuList}&title=${titlesList}`;

  if (consultList.length == 0) return;

  return (
    <div className={styles.bottomBar}>
      <span className={styles.text}>{`${t('general.consult_for')} ${
        consultList.length
      } ${t('general.product')}${consultList.length > 1 ? 's' : ''} `}</span>
      <div className={styles.buttonContainer}>
        <button className={styles.cta} onClick={() => clearConsultProducts()}>
          <Link to={contactURL}>{t('general.consult')}</Link>
        </button>
      </div>
    </div>
  );
}
