import {Price} from '~/components/Price/Price.jsx';
import {Image} from '@shopify/hydrogen';
import styles from './styles.module.scss';
import {QuoteStatus} from '../Status/Status';
import {useTranslation} from '~/i18n/index.jsx';
/**
 * @param {Pick<CustomerOrdersFragment, 'draftOrders'>}
 */
export default function QuoteView({draftOrder}) {
  const {t} = useTranslation();
  const discountApplications = draftOrder.discountInformation?.totalDiscounts;
  const discountValue = discountApplications?.amount;
  const discountPercentage = discountApplications?.percentage;

  // const draftOrder = {"id":"gid://shopify/DraftOrder/1091567648791","name":"#D131","email":"francosabolo@gmail.com","createdAt":"2024-07-25T19:21:14Z","status":"INVOICE_SENT","inReview":false,"invoiceUrl":"https://her-theme.wearetonica.com/71024541719/invoices/821d246ceaff48a52f7756d682cafa2d","lineItemsSummary":{"lineItemCount":1,"totalQuantityOfLineItems":1},"phone":null,"currencyCode":"EUR","totalTax":{"amount":"0.0","currencyCode":"EUR"},"billingAddress":null,"shippingAddress":null,"totalShippingPrice":{"amount":"0.0","currencyCode":"EUR"},"totalPrice":{"amount":"99.0","currencyCode":"EUR"},"totalLineItemsPrice":{"amount":"99.0","currencyCode":"EUR"},"customer":{"id":"gid://shopify/Customer/6957372768279","displayName":"franco sabolo"},"totalWeight":"0","updatedAt":"2024-07-25T19:21:18Z","discountInformation":{"totalDiscounts":{"amount":"0.0","currencyCode":"EUR"}}};

  return (
    <div className="account-draftOrder">
      <fieldset className={styles.fieldsContainer}>
        <div className={styles.quoteViewRow}>
          <h2>
            {t('quoting.quote')} {draftOrder?.name}
          </h2>
          <p>
            {t('quoting.placed_on')}{' '}
            {new Date(draftOrder?.createdAt).toLocaleDateString()}
          </p>
          <table className={styles.responsiveTable}>
            <thead>
              <tr>
                <th>{t('order.product')}</th>
                <th>{t('order.price')}</th>
                <th>{t('quoting.discounted_price')}</th>
                <th>{t('order.quantity')}</th>
                <th>{t('order.total')}</th>
              </tr>
            </thead>
            <tbody>
              {draftOrder.lineItems?.nodes.map((lineItem) => (
                <OrderLineRow key={lineItem.id} lineItem={lineItem} />
              ))}
            </tbody>
            <tfoot>
              {(discountValue || discountPercentage) && (
                <tr>
                  <th scope="row" colSpan={4}>
                    <p>{t('order.discounts')}</p>
                  </th>
                  <td>
                    {discountPercentage ? (
                      <span>-{discountPercentage}% OFF</span>
                    ) : (
                      discountValue && <Price data={discountApplications} />
                    )}
                  </td>
                </tr>
              )}
              <tr>
                <th scope="row" colSpan={4}>
                  <p>{t('order.subtotal')}</p>
                </th>
                <td>
                  <Price data={draftOrder?.totalLineItemsPrice} />
                </td>
              </tr>
              <tr>
                <th scope="row" colSpan={4}>
                  <p>{t('order.tax')}</p>
                </th>
                <td>
                  <Price data={draftOrder?.totalTax} />
                </td>
              </tr>
              <tr>
                <th scope="row" colSpan={4}>
                  <p>{t('order.total')}</p>
                </th>
                <td>
                  <Price data={draftOrder?.totalPrice} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className={styles.quoteViewRow}>
          <div className={styles.quoteViewField}>
            <h3>{t('order.shipping_address')}</h3>
            {draftOrder?.shippingAddress ? (
              <address>
                <p>{draftOrder?.shippingAddress?.name}</p>
                {draftOrder?.shippingAddress?.formatted && (
                  <p>{draftOrder?.shippingAddress?.formatted}</p>
                )}
                {draftOrder?.shippingAddress?.formattedArea && (
                  <p>{draftOrder?.shippingAddress?.formattedArea}</p>
                )}
              </address>
            ) : (
              <p>{t('order.no_shipping_address')}</p>
            )}
          </div>
          <div className={styles.quoteViewField}>
            <h3>{t('order.status')}</h3>
            <QuoteStatus status={draftOrder?.status} />
          </div>
        </div>
        <div className={`${styles.quoteViewRow} ${styles.right}`}>
          <div className={styles.quoteViewField}>
            <a
              target="_blank"
              href={draftOrder?.invoiceUrl}
              className={styles.menuPill}
              rel="noreferrer"
            >
              Pay this quote →
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
        <Price data={lineItem.originalUnitPrice} />
      </td>
      <td data-label="Discount" className={styles.mobile}>
        <Price data={lineItem.discountedUnitPrice} />
      </td>
      <td data-label="Qty">{lineItem.quantity}</td>
      <td data-label="Total">
        <Price data={lineItem.discountedTotal} />
      </td>
    </tr>
  );
}
