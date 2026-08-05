import {IconAvailable, IconDelayed, IconOutOfStock} from '../Icon/Icon';
import styles from './styles.module.scss';
import {Text} from '../Text/Text';
import {useTranslation} from '~/i18n/index.jsx';

/**
 * Estado de stock. Con `quantityAvailable` muestra el número real; sin él
 * (token sin scope de inventario) cae al badge binario de siempre.
 *
 * @param {{availableForSale?: boolean, currentlyNotInStock?: boolean,
 *   quantityAvailable?: number|null}}
 */
export default function AvailabilityStatus({
  availableForSale,
  currentlyNotInStock,
  quantityAvailable = null,
}) {
  return availableForSale === false ? (
    <OutOfStockBadge />
  ) : currentlyNotInStock ? (
    <DelayBadge />
  ) : (
    <AvailableBadge quantityAvailable={quantityAvailable} />
  );
}

function AvailableBadge({quantityAvailable}) {
  const {t} = useTranslation();
  const hasCount =
    typeof quantityAvailable === 'number' && quantityAvailable > 0;

  return (
    <div className={`${styles.availabilityBadge} ${styles.available}`}>
      <IconAvailable
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="none"
        className={styles.availabilityIcon}
      ></IconAvailable>
      <Text className={styles.availabilityBadge__text}>
        {hasCount ? `${quantityAvailable} u.` : t('availability.in-stock')}
      </Text>
    </div>
  );
}

function DelayBadge() {
  const {t} = useTranslation();
  return (
    <div className={`${styles.availabilityBadge} ${styles.delayed}`}>
      <IconDelayed
        width="15"
        height="14"
        viewBox="0 0 15 14"
        fill="none"
        stroke="none"
        className={styles.availabilityIcon}
      />
      <Text>{t('availability.on-demand')}</Text>
    </div>
  );
}

function OutOfStockBadge() {
  const {t} = useTranslation();
  return (
    <div className={`${styles.availabilityBadge} ${styles.outOfStock}`}>
      <IconOutOfStock
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="none"
        className={styles.availabilityIcon}
      />
      <Text>{t('availability.not-available')}</Text>
    </div>
  );
}
