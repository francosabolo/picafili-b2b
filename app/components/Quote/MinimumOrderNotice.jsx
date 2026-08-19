import {useFormatPrice} from '~/components/Price/Price.jsx';
import {getMinimumOrderStatus} from '~/lib/quote.js';
import {useTranslation} from '~/i18n/index.jsx';
import {useAccountState} from '~/context/AccountStateContext.jsx';
import styles from './minimumOrder.module.scss';

/**
 * Aviso de pedido mínimo (E13). NO bloquea: informa cuánto falta.
 *
 * @param {{total: {amount: string, currencyCode: string}|null, compact?: boolean}}
 */
export function MinimumOrderNotice({total, compact = false}) {
  const {t} = useTranslation();
  const formatPrice = useFormatPrice();
  // El mínimo de la company location del comprador, si lo tiene cargado.
  const {minimumOrderAmount} = useAccountState();
  const status = getMinimumOrderStatus(total, minimumOrderAmount);

  if (!status) return null;

  const minimum = formatPrice(status.minimum, {withoutTrailingZeros: true});

  if (status.meetsMinimum) {
    return (
      <div
        className={`${styles.notice} ${styles.met} ${
          compact ? styles.compact : ''
        }`}
      >
        <span aria-hidden="true">✓</span>
        <span>{t('quoting.minimum-met', {minimum})}</span>
      </div>
    );
  }

  return (
    <div
      className={`${styles.notice} ${styles.missing} ${
        compact ? styles.compact : ''
      }`}
    >
      <span>
        {t('quoting.minimum-missing', {
          minimum,
          missing: formatPrice(status.missing, {withoutTrailingZeros: true}),
        })}
      </span>
    </div>
  );
}
