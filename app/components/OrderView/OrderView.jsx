import {Price} from '~/components/Price/Price.jsx';
import {Image, flattenConnection} from '@shopify/hydrogen';
import styles from './styles.module.scss';
import {useTranslation} from '~/i18n/index.jsx';
import {FulfillmentStatus} from '../Status/Status';

/**
 * @param {Pick<CustomerOrdersFragment, 'orders'>}
 */
export default function OrderView({order}) {
  const {t} = useTranslation();
  const lineItems = flattenConnection(order.lineItems);
  const discountApplications = flattenConnection(order.discountApplications);
  const fulfillmentStatus = flattenConnection(order.fulfillments)[0]?.status;

  const firstDiscount = discountApplications[0]?.value;

  const discountValue =
    firstDiscount?.__typename === 'MoneyV2' && firstDiscount;

  const discountPercentage =
    firstDiscount?.__typename === 'PricingPercentageValue' &&
    firstDiscount?.percentage;

  return (
    <div className="account-order">
      <fieldset className={styles.fieldsContainer}>
        <div className={styles.orderViewRow}>
          <h2>
            {t('order.order')} {order.name}
          </h2>
          <p>
            {t('order.placed_on')} {new Date(order.processedAt).toDateString()}
          </p>
          <table className={styles.responsiveTable}>
            <thead>
              <tr>
                <th>{t('order.product')}</th>
                <th>{t('order.price')}</th>
                <th>{t('order.quantity')}</th>
                <th>{t('order.total')}</th>
              </tr>
            </thead>
            <tbody>
              {order.lineItems?.nodes.map((lineItem) => (
                <OrderLineRow key={lineItem.id} lineItem={lineItem} />
              ))}
            </tbody>
            <tfoot>
              {((discountValue && discountValue.amount) ||
                discountPercentage) && (
                <tr>
                  <th scope="row" colSpan={5}>
                    <p>{t('order.discounts')}</p>
                  </th>
                  <th scope="row">
                    <p>{t('order.discounts')}</p>
                  </th>
                  <td data-label="Total Tax">
                    {discountPercentage ? (
                      <span>
                        -{discountPercentage}% {t('order.off')}
                      </span>
                    ) : (
                      discountValue && <Price data={discountValue} />
                    )}
                  </td>
                </tr>
              )}
              <tr>
                <th scope="row" colSpan={3}>
                  <p>{t('order.subtotal')}</p>
                </th>
                <td>
                  <Price data={order.subtotal} />
                </td>
              </tr>
              <tr>
                <th scope="row" colSpan={3}>
                  <p>{t('order.tax')}</p>
                </th>
                <td>
                  <Price data={order.totalTax} />
                </td>
              </tr>
              <tr>
                <th scope="row" colSpan={3}>
                  <p>{t('order.total')}</p>
                </th>
                <td>
                  <Price data={order.totalPrice} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className={styles.orderViewRow}>
          <div className={styles.orderViewField}>
            <h3>{t('order.shipping_address')}</h3>
            {order?.shippingAddress ? (
              <address>
                <p>{order.shippingAddress.name}</p>
                {order.shippingAddress.formatted ? (
                  <p>{order.shippingAddress.formatted}</p>
                ) : (
                  ''
                )}
                {order.shippingAddress.formattedArea ? (
                  <p>{order.shippingAddress.formattedArea}</p>
                ) : (
                  ''
                )}
              </address>
            ) : (
              <p>{t('order.no_shipping_address')}</p>
            )}
          </div>
          <div className={styles.orderViewField}>
            <h3>{t('order.status')}</h3>
            <div>
              <FulfillmentStatus status={fulfillmentStatus} />
            </div>
          </div>
        </div>
        <div className={`${styles.orderViewRow} ${styles.right}`}>
          <div className={styles.orderViewField}>
            <a
              target="_blank"
              href={order.statusPageUrl}
              className={styles.menuPill}
              rel="noreferrer"
            >
              {t('order.track_my_order')} →
            </a>
          </div>
        </div>
      </fieldset>
    </div>
  );
}

/**
 * @param {{lineItem: OrderLineItemFullFragment}}
 */
function OrderLineRow({lineItem}) {
  const {t} = useTranslation();
  return (
    <tr key={lineItem.id} className={styles.lineRow}>
      <td className={styles.lineItemImage}>
        <div className={styles.fieldImage}>
          {lineItem?.image && (
            <div>
              <Image data={lineItem.image} width={96} height={96} />
            </div>
          )}
          <div>
            <p>{lineItem.title}</p>
            <small>{lineItem.variantTitle}</small>
          </div>
        </div>
      </td>
      <td data-label="Price">
        <Price data={lineItem.price} />
      </td>
      <td data-label="Qty">{lineItem.quantity}</td>
      <td data-label="Discount">
        <Price data={lineItem.totalDiscount} />
      </td>
    </tr>
  );
}
