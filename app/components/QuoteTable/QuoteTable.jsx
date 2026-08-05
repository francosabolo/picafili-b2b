import {Price} from '~/components/Price/Price.jsx';
import {Pagination} from '@shopify/hydrogen';
import {Link} from '@remix-run/react';
import styles from './styles.module.scss';
import {useTranslation} from '~/i18n/index.jsx';
import {QuoteStatus} from '../Status/Status';
import {IconPreview} from '../Icon/Icon';

/**
 * @param draftOrders
 */
export default function QuoteTable({draftOrders}) {
  const {t} = useTranslation();
  return (
    <div className={styles.draftOrders}>
      {draftOrders?.nodes.length ? (
        <Pagination connection={draftOrders}>
          {({nodes, isLoading, PreviousLink, NextLink}) => {
            return (
              <>
                <PreviousLink>
                  {isLoading ? (
                    t('orders.loading')
                  ) : (
                    <span>↑ {t('orders.load_previous')}</span>
                  )}
                </PreviousLink>
                <div className={styles.headingRow}>
                  <div className={styles.headingCell}>{t('quoting.name')}</div>
                  <div className={styles.headingCell}>{t('orders.date')}</div>
                  <div className={styles.headingCell}>{t('orders.status')}</div>
                  <div className={styles.headingCell}>{t('order.price')}</div>
                  <div className={`${styles.field} ${styles.desktop}`}>
                    <div className={styles.headingCell}>
                      {t('order.shipping_address')}
                    </div>
                  </div>
                  <div className={styles.headingCell}></div>
                </div>
                {nodes.map((order) => {
                  return <QuoteItem key={order.id} order={order} />;
                })}
                <NextLink>
                  {isLoading ? (
                    'Loading...'
                  ) : (
                    <span>{t('general.load-more')} ↓</span>
                  )}
                </NextLink>
              </>
            );
          }}
        </Pagination>
      ) : (
        <EmptyDraftOrders />
      )}
    </div>
  );
}

/**
 * @param {{order: OrderItemFragment}}
 */
function QuoteItem({order}) {
  const {t} = useTranslation();
  return (
    <div className={styles.fieldsContainer}>
      <div className={styles.field}>
        <Link to={`/account/quotes/${btoa(order.id)}`}>
          <strong>{order.name}</strong>
        </Link>
      </div>
      <div className={styles.field}>
        <p>{new Date(order.createdAt).toDateString()}</p>
      </div>
      <div className={styles.field}>
        <QuoteStatus status={order?.status} />
      </div>
      <div className={styles.field}>
        <Price data={order.totalPrice} />
      </div>
      <div className={`${styles.field} ${styles.desktop}`}>
        <p>
          {order.shippingAddress?.firstName
            ? order.shippingAddress?.firstName
            : ''}
        </p>
      </div>
      <div className={`${styles.field} ${styles.desktop}`}>
        <Link
          className={styles.menuPill}
          to={`/account/quotes/${btoa(order.id)}`}
        >
          {t('account.view-quote')}
        </Link>
      </div>
      <div className={`${styles.field} ${styles.mobile}`}>
        <Link
          className={`${styles.menuPill} ${styles.viewIcon}`}
          to={`/account/quotes/${btoa(order.id)}`}
        >
          <IconPreview />
        </Link>
      </div>
    </div>
  );
}

function EmptyDraftOrders() {
  return (
    <div>
      <p>You haven\&apos;t placed any quotes yet.</p>
      <br />
      <p>
        <Link to="/collections">Start Shopping →</Link>
      </p>
    </div>
  );
}
