import {useLocation, useMatches} from '@remix-run/react';
import styles from './styles.module.scss';
import {IconCaret} from '../Icon/Icon';
import {useTranslation} from '~/i18n/index.jsx';

export default function Breadcrumb({product}) {
  const {t} = useTranslation();
  const [root] = useMatches();
  const localizationInfo = root.data.i18n;
  const languagePath = localizationInfo.isDefault
    ? ''
    : localizationInfo.pathPrefix;

  const location = useLocation();
  const previousCollectionHandle = location?.state?.pathname?.split('/').at(-1);
  const productCollections = product.collections?.nodes;
  const firstProductCollection = product.collections?.nodes[0];

  const previousCollection = productCollections.find((element) => {
    if (element.handle == previousCollectionHandle) {
      element.pathname = location?.state?.pathname;
      return element;
    } else {
      firstProductCollection.pathname = `${languagePath}/collections/${firstProductCollection.handle}`;
      return firstProductCollection;
    }
  });

  return (
    <div className={styles.breadcrumb}>
      <IconCaret direction={'right'} viewBox={'0 4 17 20'} />
      <a
        href={`${languagePath}/collections/all-products`}
        className={styles.breadcrumbProducts}
      >
        {t('collections.products')}
      </a>
      {previousCollection && (
        <a
          href={previousCollection?.pathname}
          className={styles.breadcrumbCollectionTitle}
        >
          / {previousCollection?.title}
        </a>
      )}
      <div className={styles.breadcrumbProductTitle}>/ {product.title}</div>
    </div>
  );
}
