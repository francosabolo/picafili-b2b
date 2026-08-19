import styles from './styles.module.scss';
import {useTranslation} from '~/i18n/index.jsx';

/**
 * Los estados de un pedido, dichos en el idioma del portal y con el color que
 * les corresponde.
 *
 * Antes cada estado estaba escrito a mano en inglés —"Refunded", "Success",
 * "Voided"— y **todos compartían la misma clase verde**, así que un pedido
 * reembolsado se veía igual que uno entregado. En una zona de cuenta eso no es
 * un detalle estético: el color es lo primero que se lee de una tabla de
 * pedidos, y estaba diciendo que todo salió bien siempre.
 *
 * El tono sale del significado, no del estado: bien / esperando / mal /
 * neutro. Cada estado de Shopify se mapea a uno de esos cuatro y a una clave de
 * diccionario, que es lo que hace que esto se traduzca sin tocar el componente.
 */

/** Estado → {clave de i18n, tono}. Lo desconocido se muestra crudo. */
const FULFILLMENT = {
  SUCCESS: ['status.fulfillment.success', 'ok'],
  OPEN: ['status.fulfillment.open', 'waiting'],
  PENDING: ['status.fulfillment.pending', 'waiting'],
  IN_PROGRESS: ['status.fulfillment.in-progress', 'waiting'],
  ON_HOLD: ['status.fulfillment.on-hold', 'waiting'],
  SCHEDULED: ['status.fulfillment.scheduled', 'waiting'],
  CANCELLED: ['status.fulfillment.cancelled', 'neutral'],
  ERROR: ['status.fulfillment.error', 'bad'],
  FAILURE: ['status.fulfillment.failure', 'bad'],
};

const FINANCIAL = {
  PAID: ['status.financial.paid', 'ok'],
  AUTHORIZED: ['status.financial.authorized', 'ok'],
  PARTIALLY_PAID: ['status.financial.partially-paid', 'waiting'],
  PENDING: ['status.financial.pending', 'waiting'],
  PARTIALLY_REFUNDED: ['status.financial.partially-refunded', 'neutral'],
  REFUNDED: ['status.financial.refunded', 'neutral'],
  EXPIRED: ['status.financial.expired', 'bad'],
  VOIDED: ['status.financial.voided', 'bad'],
};

const TONE_CLASS = {
  ok: 'statusOk',
  waiting: 'statusWaiting',
  bad: 'statusBad',
  neutral: 'statusNeutral',
};

/**
 * @param {{status: string, map: Record<string, [string, string]>}}
 */
function StatusPill({status, map}) {
  const {t} = useTranslation();

  if (!status) return null;

  const entry = map[status];
  // Un estado que Shopify agregue mañana se muestra crudo en vez de
  // desaparecer: es feo, pero es información. Vacío sería mentir por omisión.
  const label = entry ? t(entry[0]) : status;
  const tone = entry ? entry[1] : 'neutral';

  return <span className={styles[TONE_CLASS[tone]]}>{label}</span>;
}

export function FulfillmentStatus({status}) {
  return <StatusPill status={status} map={FULFILLMENT} />;
}

export function OrderStatus({status}) {
  return <StatusPill status={status} map={FULFILLMENT} />;
}

export function FinancialStatus({status}) {
  return <StatusPill status={status} map={FINANCIAL} />;
}

export function QuoteStatus({status}) {
  const {t} = useTranslation();

  switch (status) {
    case 'COMPLETED':
      return (
        <span className={styles.statusOk}>{t('quoting.status-completed')}</span>
      );
    case 'INVOICE_SENT':
      return (
        <span className={styles.statusWaiting}>{t('quoting.status-sent')}</span>
      );
    case 'OPEN':
      return (
        <span className={styles.statusNeutral}>{t('quoting.status-open')}</span>
      );
    default:
      return (
        <span className={styles.statusNeutral}>
          {t('quoting.status-unknown')}
        </span>
      );
  }
}
