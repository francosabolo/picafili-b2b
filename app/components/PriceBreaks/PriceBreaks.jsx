import {Price, useFormatPrice} from '~/components/Price/Price.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import styles from './styles.module.scss';

/**
 * Tabla de quiebres por cantidad (E4 del backlog).
 *
 * Los quiebres los define el catálogo B2B en Shopify. Si no hay ninguno
 * configurado el componente no renderiza nada: no inventa tramos ni muestra
 * una tabla vacía con el precio de lista repetido.
 *
 * @param {{variant?: object, quantity?: number}}
 */
export function PriceBreaks({variant, quantity = 1}) {
  const {t} = useTranslation();
  const formatPrice = useFormatPrice();
  const breaks = variant?.quantityPriceBreaks?.nodes ?? [];

  if (breaks.length === 0) return null;

  const ordered = [...breaks].sort(
    (a, b) => a.minimumQuantity - b.minimumQuantity,
  );

  // Tramo vigente para la cantidad elegida: el mayor mínimo que ya se alcanzó.
  const activeIndex = ordered.reduce(
    (found, tier, index) => (quantity >= tier.minimumQuantity ? index : found),
    -1,
  );
  const nextTier = ordered[activeIndex + 1];

  return (
    <div className={styles.priceBreaks}>
      <span className={styles.heading}>{t('price.by-quantity')}</span>

      <ul className={styles.tiers}>
        {ordered.map((tier, index) => (
          <li
            key={tier.minimumQuantity}
            className={`${styles.tier} ${
              index === activeIndex ? styles.tierActive : ''
            }`}
          >
            <span className={styles.tierQty}>
              {t('price.from-quantity', {quantity: tier.minimumQuantity})}
            </span>
            <Price
              className={styles.tierPrice}
              data={tier.price}
              withoutTrailingZeros
            />
          </li>
        ))}
      </ul>

      {nextTier && (
        <p className={styles.nudge}>
          {t('price.next-tier-nudge', {
            quantity: nextTier.minimumQuantity - quantity,
            price: formatPrice(nextTier.price, {withoutTrailingZeros: true}),
          })}
        </p>
      )}
    </div>
  );
}
