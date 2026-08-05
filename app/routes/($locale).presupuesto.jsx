import {Link} from '@remix-run/react';
import {Image} from '@shopify/hydrogen';
import {PageWidthContainer} from '~/components/PageWidthContainer/PageWidthContainer.jsx';
import {Price, useFormatPrice} from '~/components/Price/Price.jsx';
import {MinimumOrderNotice} from '~/components/Quote/MinimumOrderNotice.jsx';
import {QuoteSubmitForm} from '~/components/Quote/QuoteSubmitForm.jsx';
import AvailabilityStatus from '~/components/AvailabilityStatus/AvailabilityStatus.jsx';
import QuoteItemActions from '~/components/QuoteItemActions/QuoteItemActions.jsx';
import {useQuote} from '~/context/QuoteContext.jsx';
import {useAccountState} from '~/context/AccountStateContext.jsx';
import {useDiscountContext} from '~/context/DiscountContext.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {pageTitle} from '~/lib/utils.js';
import {getQuoteTotals, getLineUnitPrice} from '~/lib/quote.js';
import {
  getEffectiveDiscount,
  resolveLineDiscounts,
  getEditableSlots,
  clampDiscount,
} from '~/lib/discounts.js';
import {MAX_LINE_DISCOUNT} from '~/lib/const.js';
import styles from '~/styles/pages/Quote.module.scss';

/**
 * Carrito de presupuesto — la pantalla completa.
 *
 * El drawer sirve para "¿qué llevo hasta ahora?", pero revisar un pedido
 * mayorista de 20 líneas en un panel de 375px no es razonable: no entra el
 * desglose de descuentos, no hay lugar para editar y el comprador termina
 * enviando sin leer. Esta pantalla es donde se revisa y se cierra.
 *
 * @type {MetaFunction}
 */
export const meta = ({matches}) => {
  return [{title: pageTitle(matches, 'quote-page.title')}];
};

export default function QuotePage() {
  const {t} = useTranslation();
  const {quoteItems, removeQuoteItem, setLineDiscount, clearQuoteItems} =
    useQuote();
  const {canOrder, company, id: roleId} = useAccountState();
  const discountContext = useDiscountContext();

  // Que slots puede editar este rol lo decide la config, no el componente:
  // una tienda puede tener dos editables, o ninguno.
  const editableSlots = getEditableSlots(roleId);

  if (!canOrder) {
    return (
      <PageWidthContainer>
        <div className={styles.page}>
          <h1>{t('quote-page.title')}</h1>
          <p className={styles.lead}>{t('quote-page.locked')}</p>
        </div>
      </PageWidthContainer>
    );
  }

  if (!quoteItems.length) {
    return (
      <PageWidthContainer>
        <div className={styles.page}>
          <h1>{t('quote-page.title')}</h1>
          <div className={styles.empty}>
            <p>{t('quote-page.empty')}</p>
            <Link className={styles.primaryLink} to="/compra-rapida">
              {t('home.cta-quick-order')}
            </Link>
          </div>
        </div>
      </PageWidthContainer>
    );
  }

  const totals = getQuoteTotals(quoteItems, discountContext);

  return (
    <PageWidthContainer>
      <div className={styles.page}>
        <header className={styles.head}>
          <h1>{t('quote-page.title')}</h1>
          {company && (
            <p className={styles.forCompany}>
              {t('quoting.buying-for')} <strong>{company}</strong>
            </p>
          )}
        </header>

        {/* Quien puede editar descuentos necesita saber que lo que toca acá
            lo ve el cliente. */}
        {editableSlots.length > 0 && (
          <p className={styles.repNotice}>{t('quote-page.rep-notice')}</p>
        )}

        <ul className={styles.lines}>
          {quoteItems.map((item) => (
            <QuoteLine
              key={item.id}
              item={item}
              editableSlots={editableSlots}
              discountContext={discountContext}
              onDiscountChange={setLineDiscount}
              onRemove={removeQuoteItem}
            />
          ))}
        </ul>

        <footer className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>{t('quoting.subtotal', {units: totals.units})}</span>
            <Price data={totals.subtotal} withoutTrailingZeros />
          </div>
          <div className={`${styles.summaryRow} ${styles.grandTotal}`}>
            <span>{t('quoting.total')}</span>
            <Price data={totals.total} withoutTrailingZeros />
          </div>
          <MinimumOrderNotice total={totals.subtotal} />
          {/* El envio ocurre ACA, no en el drawer: esta es la pantalla de
              revision y obligar a volver al panel para cerrar era el problema
              que la motivo. */}
          <QuoteSubmitForm />
          <button
            type="button"
            className={styles.clear}
            onClick={clearQuoteItems}
          >
            {t('quoting.clear')}
          </button>
        </footer>
      </div>
    </PageWidthContainer>
  );
}

/**
 * Una línea con su cadena de descuentos desplegada.
 *
 * El desglose se muestra siempre que haya algún descuento, no solo al vendedor:
 * el comprador mayorista controla de dónde sale cada punto, y un total que no
 * puede explicar es un total que va a preguntar por teléfono.
 */
function QuoteLine({
  item,
  editableSlots,
  discountContext,
  onDiscountChange,
  onRemove,
}) {
  const {t} = useTranslation();
  const formatPrice = useFormatPrice();

  const chain = resolveLineDiscounts(item, discountContext);
  const effective = getEffectiveDiscount(chain);

  // Una fila por descuento, y UNA sola.
  //
  // Antes la cadena listaba todos los aplicados y despues los slots editables
  // se volvian a listar con su input: "Descuento 3" salia dos veces, una como
  // dato y otra como campo, con el efectivo en el medio. El desglose tiene que
  // leerse como una cuenta de arriba hacia abajo, y para eso cada concepto
  // aparece una vez — el que el vendedor puede tocar simplemente trae un input
  // en lugar del porcentaje fijo.
  const editableIds = new Set(editableSlots.map((slot) => slot.id));

  const rows = [
    ...chain.map((discount) => ({
      id: discount.id,
      label: discount.labelKey ? t(discount.labelKey) : discount.label,
      percent: discount.percent,
      source: discount.source,
      editable: editableIds.has(discount.id),
    })),
    // Slots editables que todavia estan en cero: no son parte de la cadena
    // —no descuentan nada— pero tienen que estar visibles o el vendedor no
    // tiene donde escribir.
    ...editableSlots
      .filter((slot) => !chain.some((discount) => discount.id === slot.id))
      .map((slot) => ({
        id: slot.id,
        label: t(slot.labelKey),
        percent: 0,
        source: slot.source,
        editable: true,
      })),
  ];
  const unit = getLineUnitPrice(item, discountContext);
  const quantity = Number(item.quantity) || 1;

  const listUnit = Number(item?.price?.amount ?? 0);
  const lineTotal = {
    amount: (unit * quantity).toFixed(2),
    currencyCode: item?.price?.currencyCode,
  };

  return (
    <li className={styles.line}>
      {item?.image?.url && (
        <Image
          className={styles.lineImage}
          src={item.image.url}
          alt={item.image.altText || ''}
          width="72px"
          height="72px"
        />
      )}

      <div className={styles.lineBody}>
        <span className={styles.lineTitle}>
          {item?.product?.title ?? item?.sku}
        </span>
        <span className={styles.lineMeta}>
          <span className={styles.lineSku}>{item?.sku}</span>
          <AvailabilityStatus
            availableForSale={item.availableForSale}
            currentlyNotInStock={item.currentlyNotInStock}
          />
        </span>
        <QuoteItemActions quoteItem={item} quantity={item.quantity} />
      </div>

      <div className={styles.lineDiscounts}>
        <dl className={styles.breakdown}>
          <div className={styles.breakdownRow}>
            <dt>{t('quote-page.list-price')}</dt>
            <dd>{formatPrice(item?.price, {withoutTrailingZeros: true})}</dd>
          </div>

          {rows.map((row) =>
            row.editable ? (
              <div className={styles.breakdownRow} key={row.id}>
                <dt>
                  <label htmlFor={`${item.id}-${row.id}`}>{row.label}</label>
                </dt>
                <dd className={styles.repInputWrap}>
                  <input
                    id={`${item.id}-${row.id}`}
                    type="number"
                    min="0"
                    max={MAX_LINE_DISCOUNT}
                    step="1"
                    value={item.discounts?.[row.id] ?? 0}
                    onChange={(event) =>
                      onDiscountChange(
                        item.id,
                        row.id,
                        clampDiscount(event.target.value),
                      )
                    }
                  />
                  <span aria-hidden="true">%</span>
                </dd>
              </div>
            ) : (
              <div
                className={`${styles.breakdownRow} ${styles[row.source] ?? ''}`}
                key={row.id}
              >
                <dt>{row.label}</dt>
                <dd>−{row.percent}%</dd>
              </div>
            ),
          )}

          {/* El efectivo solo aparece cuando hay algo que combinar: con un
              unico descuento repetiria el mismo numero dos lineas mas abajo. */}
          {chain.length > 1 && (
            <div className={`${styles.breakdownRow} ${styles.effectiveRow}`}>
              <dt>{t('quote-page.effective-label')}</dt>
              <dd>−{effective}%</dd>
            </div>
          )}

          <div className={`${styles.breakdownRow} ${styles.unitRow}`}>
            <dt>{t('quote-page.unit-price')}</dt>
            <dd>
              {formatPrice(
                {amount: String(unit), currencyCode: item?.price?.currencyCode},
                {withoutTrailingZeros: true},
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className={styles.lineTotals}>
        <span className={styles.lineTotal}>
          <Price data={lineTotal} withoutTrailingZeros />
        </span>
        {effective > 0 && listUnit > 0 && (
          <span className={styles.lineWas}>
            {formatPrice(
              {
                amount: (listUnit * quantity).toFixed(2),
                currencyCode: item?.price?.currencyCode,
              },
              {withoutTrailingZeros: true},
            )}
          </span>
        )}
        <button
          type="button"
          className={styles.remove}
          onClick={() => onRemove(item.id)}
        >
          {t('quoting.clear-line')}
        </button>
      </div>
    </li>
  );
}

/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */
