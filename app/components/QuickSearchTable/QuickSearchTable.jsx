import {QuickSearchItem} from '../QuickSearchItem/QuickSearchItem.jsx';
import {getImageLoadingPriority} from '~/lib/const';
import styles from './styles.module.scss';
import {useTranslation} from '~/i18n/index.jsx';
import {Pagination} from '@shopify/hydrogen';

export function QuickSearchTable({searchResults}) {
  const {t} = useTranslation();

  if (searchResults?.edges?.length <= 0) {
    return (
      <div className={styles.wrapper}>
        <p>{t('product.configurator.no-results')}</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableHeading}>
        <div className={styles.header}>
          <span id={styles.sku}>{t('product.configurator.code')}</span>
          <span id={styles.price}>{t('product.price')}</span>
          <span id={styles.description}>
            {t('product.configurator.description')}
          </span>
          <span id={styles.attributes}>
            {t('product.configurator.variant')}
          </span>
          <span id={styles.badge}>
            {t('product.configurator.availability')}
          </span>
        </div>
      </div>
      <div className={styles.tableItems}>
        <Pagination connection={searchResults}>
          {({nodes, isLoading, hasNextPage, NextLink}) => {
            return (
              <>
                {nodes?.map((product, i) => {
                  return (
                    <QuickSearchItem
                      key={'qSProductCard' + i}
                      product={product}
                      loading={getImageLoadingPriority(i)}
                    />
                  );
                })}
                {/* Solo si hay pagina siguiente. Se renderizaba siempre, asi
                    que con un unico resultado quedaba un bloque vacio del alto
                    del boton debajo de la fila — espacio reservado para algo
                    que no existe.

                    Ojo: la señal es `hasNextPage`, NO `nextPageUrl`. Ese
                    ultimo viene con valor igual sin pagina siguiente, asi que
                    el div se renderizaba VACIO — y como `.loadMoreButton`
                    tiene `margin: 48px 0 40px`, dejaba 88px de hueco. */}
                {hasNextPage && (
                  <div className={`loadMoreButton`}>
                    <NextLink>
                      {isLoading ? (
                        'Loading...'
                      ) : (
                        <span>{t('general.load-more')}</span>
                      )}
                    </NextLink>
                  </div>
                )}
              </>
            );
          }}
        </Pagination>
      </div>
    </div>
  );
}
