import {Price} from '~/components/Price/Price.jsx';
import {Image, flattenConnection} from '@shopify/hydrogen';
import styles from './styles.module.scss';
import {useTranslation} from '~/i18n/index.jsx';
import {FulfillmentStatus} from '../Status/Status';
import {useLocale} from '~/i18n/useLocale.jsx';
import {formatLongDate} from '~/lib/utils.js';

/**
 * @param {Pick<CustomerOrdersFragment, 'orders'>}
 */
export default function OrderView({order}) {
  const {t} = useTranslation();
  const locale = useLocale();
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
          <p className={styles.placedOn}>
            {t('order.placed_on')}{' '}
            {formatLongDate(order.processedAt, locale?.language)}
          </p>
          <table className={styles.responsiveTable}>
            <thead>
              <tr>
                <th>{t('order.product')}</th>
                <th className={styles.amountCell}>{t('order.price')}</th>
                <th className={styles.quantityCell}>{t('order.quantity')}</th>
                <th className={styles.amountCell}>{t('order.total')}</th>
              </tr>
            </thead>
            <tbody>
              {order.lineItems?.nodes.map((lineItem) => (
                <OrderLineRow key={lineItem.id} lineItem={lineItem} />
              ))}
            </tbody>
            <tfoot>
              {/* La tabla tiene CUATRO columnas. El descuento venía con
                  `colSpan={5}` y una segunda celda de encabezado, así que el
                  navegador inventaba columnas y el bloque se salía por la
                  derecha, desalineado del resto. */}
              {((discountValue && discountValue.amount) ||
                discountPercentage) && (
                <tr>
                  <th scope="row" colSpan={3}>
                    {t('order.discounts')}
                  </th>
                  <td className={styles.amountCell}>
                    {discountPercentage ? (
                      <span>
                        −{discountPercentage}% {t('order.off')}
                      </span>
                    ) : (
                      discountValue && <Price data={discountValue} />
                    )}
                  </td>
                </tr>
              )}
              <tr>
                <th scope="row" colSpan={3}>
                  {t('order.subtotal')}
                </th>
                <td className={styles.amountCell}>
                  <Price data={order.subtotal} />
                </td>
              </tr>
              <tr>
                <th scope="row" colSpan={3}>
                  {t('order.tax')}
                </th>
                <td className={styles.amountCell}>
                  <Price data={order.totalTax} />
                </td>
              </tr>
              <tr className={styles.totalRow}>
                <th scope="row" colSpan={3}>
                  {t('order.total')}
                </th>
                <td className={styles.amountCell}>
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
      <td className={styles.amountCell} data-label={t('order.price')}>
        <Price data={lineItem.price} />
      </td>
      <td className={styles.quantityCell} data-label={t('order.quantity')}>
        {lineItem.quantity}
      </td>
      {/* El total DE LA LÍNEA: precio × cantidad, menos lo que se haya
          descontado. La columna decía "Total" y mostraba `totalDiscount`, que
          en un pedido sin descuentos es 0 — de ahí el "ARS 0,00" al lado de un
          producto de ARS 100. */}
      <td className={styles.amountCell} data-label={t('order.total')}>
        <Price data={lineTotal(lineItem)} />
      </td>
    </tr>
  );
}

/**
 * Total de una línea: precio × cantidad menos su descuento.
 *
 * La Customer Account API no lo trae armado para la línea, así que se calcula
 * acá con lo que sí manda. Devuelve la misma forma que `MoneyV2` para que
 * `<Price>` no tenga que saber de dónde salió.
 *
 * @param {{price?: object, quantity?: number, totalDiscount?: object}} lineItem
 */
function lineTotal(lineItem) {
  const unit = Number(lineItem?.price?.amount ?? 0);
  const quantity = Number(lineItem?.quantity ?? 0);
  const discount = Number(lineItem?.totalDiscount?.amount ?? 0);

  return {
    amount: Math.max(0, unit * quantity - discount).toFixed(2),
    currencyCode: lineItem?.price?.currencyCode,
  };
}
