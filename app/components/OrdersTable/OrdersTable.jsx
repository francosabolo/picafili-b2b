import {Price} from '~/components/Price/Price.jsx';
import {Pagination} from '@shopify/hydrogen';
import {flattenConnection} from '@shopify/hydrogen';
import {Link} from '@remix-run/react';
import styles from './styles.module.scss';
import {useTranslation} from '~/i18n/index.jsx';
import {useLocale} from '~/i18n/useLocale.jsx';
import {FulfillmentStatus, FinancialStatus} from '../Status/Status';
import {IconPreview} from '../Icon/Icon';

/**
 * @param {Pick<CustomerOrdersFragment, 'orders'>}
 */
export default function OrdersTable({orders}) {
  const {t} = useTranslation();
  return (
    <div className={styles.accountOrders}>
      {orders?.nodes.length ? (
        <Pagination connection={orders}>
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
                  <div className={styles.headingCell}>{t('orders.code')}</div>
                  <div className={styles.headingCell}>{t('orders.date')}</div>
                  <div className={styles.headingCell}>{t('orders.status')}</div>
                  <div className={`${styles.headingCell} ${styles.desktop}`}>
                    {t('order.fulfillment_status')}
                  </div>
                  <div className={styles.headingCell}>{t('order.total')}</div>
                  <div className={styles.headingCell}></div>
                </div>
                {nodes.map((order) => {
                  return <OrderItem key={order.id} order={order} />;
                })}
                <NextLink>
                  {isLoading ? (
                    t('orders.loading')
                  ) : (
                    <span>{t('orders.load_more')} ↓</span>
                  )}
                </NextLink>
              </>
            );
          }}
        </Pagination>
      ) : (
        <EmptyOrders />
      )}
    </div>
  );
}

/**
 * @param {{order: OrderItemFragment}}
 */
function OrderItem({order}) {
  const {t} = useTranslation();
  const locale = useLocale();
  const fulfillmentStatus = flattenConnection(order.fulfillments)[0]?.status;

  return (
    <div className={styles.fieldsContainer}>
      <div className={styles.field}>
        <Link to={`/account/orders/${btoa(order.id)}`}>#{order.number}</Link>
      </div>
      <div className={styles.field}>
        {/* `toDateString()` devuelve "Wed Apr 23 2025" — en inglés siempre, sin
            importar el idioma del portal ni el país de la tienda. */}
        <p>{formatOrderDate(order.processedAt, locale?.language)}</p>
      </div>
      <div className={styles.field}>
        <FinancialStatus status={order.financialStatus} />
      </div>
      <div className={`${styles.field} ${styles.desktop}`}>
        {fulfillmentStatus && <FulfillmentStatus status={fulfillmentStatus} />}
      </div>
      <div className={styles.field}>
        <Price data={order.totalPrice} />
      </div>

      <div className={`${styles.field} ${styles.desktop}`}>
        <Link
          className={styles.menuPill}
          to={`/account/orders/${btoa(order.id)}`}
        >
          {t('orders.view_order')}
        </Link>
      </div>
      <div className={`${styles.field} ${styles.mobile}`}>
        <Link
          className={`${styles.menuPill} ${styles.viewIcon}`}
          to={`/account/orders/${btoa(order.id)}`}
        >
          <IconPreview />
        </Link>
      </div>
    </div>
  );
}

function EmptyOrders() {
  const {t} = useTranslation();
  return (
    <div>
      <p>{t('orders.no_orders')}</p>
      <br />
      <p>
        <Link to="/collections">{t('orders.start_shopping')} →</Link>
      </p>
    </div>
  );
}

/**
 * Fecha del pedido en el idioma activo.
 *
 * Formato largo con mes en palabra: en una lista de pedidos, "23 de abril de
 * 2025" no se confunde con nada, mientras que 4/23 y 23/4 son la misma fecha
 * escrita para dos países distintos.
 *
 * @param {string} value
 * @param {string} [language] código de idioma del portal (`ES`, `EN`, `FR`)
 */
function formatOrderDate(value, language) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  try {
    return new Intl.DateTimeFormat(language?.toLowerCase() || 'es', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch (error) {
    return date.toISOString().slice(0, 10);
  }
}
