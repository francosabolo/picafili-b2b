import {NavLink} from '@remix-run/react';
import {useTranslation} from '~/i18n/index.jsx';
import {useAccountState} from '~/context/AccountStateContext.jsx';
import {Price} from '~/components/Price/Price.jsx';
import {
  COMMERCIAL_TERMS,
  MINIMUM_ORDER_AMOUNT,
  SALES_CONTACT,
  STORE_CURRENCY,
} from '~/lib/const.js';
import styles from './styles.module.scss';

/**
 * Las columnas de información del pie: contacto comercial, condiciones y
 * accesos de cuenta.
 *
 * **Por qué existen.** El pie que traía el fork era el menú de Shopify y nada
 * más. Un comprador mayorista usa el pie para tres cosas concretas —conseguir
 * el teléfono de ventas, confirmar plazos y mínimos antes de cerrar, y volver a
 * sus pedidos— y ninguna estaba. La consecuencia es que esas preguntas se
 * resuelven por teléfono, que es exactamente lo que un portal de autogestión
 * viene a evitar.
 *
 * **Todo lo que se muestra es opcional.** Cada bloque se oculta entero si no
 * tiene contenido: una tienda que no cargó su teléfono no muestra una columna
 * vacía, muestra una columna menos. Los datos salen de `app/lib/const.js` y los
 * textos de i18n — nada de esto está escrito en el componente.
 */
export function FooterInfo() {
  const {t} = useTranslation();

  return (
    <>
      <SalesContact t={t} />
      <CommercialTerms t={t} />
      <AccountLinks t={t} />
    </>
  );
}

/**
 * @param {{t: (key: string) => string}}
 */
function SalesContact({t}) {
  const {phone, phoneLabel, whatsapp, email, hoursKey} = SALES_CONTACT;
  if (!phone && !whatsapp && !email && !hoursKey) return null;

  return (
    <div className={styles.infoColumn}>
      <h2 className={styles.infoTitle}>{t('footer.contact.title')}</h2>
      <ul className={styles.infoList}>
        {phone && (
          <li>
            <a href={`tel:${phone}`}>{phoneLabel ?? phone}</a>
          </li>
        )}
        {whatsapp && (
          <li>
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              {t('footer.contact.whatsapp')}
            </a>
          </li>
        )}
        {email && (
          <li>
            <a href={`mailto:${email}`}>{email}</a>
          </li>
        )}
        {hoursKey && <li className={styles.infoNote}>{t(hoursKey)}</li>}
      </ul>
    </div>
  );
}

/**
 * @param {{t: (key: string) => string}}
 */
function CommercialTerms({t}) {
  const {showMinimumOrder, deliveryKey, shippingAreasKey, paymentKey} =
    COMMERCIAL_TERMS;

  // El mínimo se muestra solo si además hay un monto configurado: encender el
  // flag sin cargar el monto mostraría "Pedido mínimo: $0".
  const showMinimum = showMinimumOrder && MINIMUM_ORDER_AMOUNT > 0;
  if (!showMinimum && !deliveryKey && !shippingAreasKey && !paymentKey) {
    return null;
  }

  return (
    <div className={styles.infoColumn}>
      <h2 className={styles.infoTitle}>{t('footer.terms.title')}</h2>
      <ul className={styles.infoList}>
        {showMinimum && (
          <li>
            <span className={styles.infoLabel}>
              {t('footer.terms.minimum')}
            </span>{' '}
            {/* El mismo monto que valida la nota de pedido, no una copia:
                MINIMUM_ORDER_AMOUNT es la unica fuente. */}
            <Price
              data={{
                amount: String(MINIMUM_ORDER_AMOUNT),
                currencyCode: STORE_CURRENCY,
              }}
              withoutTrailingZeros
            />
          </li>
        )}
        {deliveryKey && (
          <li>
            <span className={styles.infoLabel}>
              {t('footer.terms.delivery')}
            </span>{' '}
            {t(deliveryKey)}
          </li>
        )}
        {shippingAreasKey && (
          <li>
            <span className={styles.infoLabel}>{t('footer.terms.areas')}</span>{' '}
            {t(shippingAreasKey)}
          </li>
        )}
        {paymentKey && (
          <li>
            <span className={styles.infoLabel}>
              {t('footer.terms.payment')}
            </span>{' '}
            {t(paymentKey)}
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * Accesos que un mayorista vuelve a buscar al pie: sus pedidos, sus
 * presupuestos y la lista de precios.
 *
 * La lista de precios solo aparece para quien puede ver precios. El endpoint ya
 * tiene su propio gate en el servidor (`api.lista-precios.csv`), así que esto
 * no es seguridad: es no ofrecerle a un invitado un link que le va a dar vacío.
 *
 * @param {{t: (key: string) => string}}
 */
function AccountLinks({t}) {
  const {canSeePrices} = useAccountState();

  return (
    <div className={styles.infoColumn}>
      <h2 className={styles.infoTitle}>{t('footer.account.title')}</h2>
      <ul className={styles.infoList}>
        <li>
          <NavLink prefetch="intent" to="/account/orders">
            {t('footer.account.orders')}
          </NavLink>
        </li>
        <li>
          <NavLink prefetch="intent" to="/account/quotes">
            {t('footer.account.quotes')}
          </NavLink>
        </li>
        <li>
          <NavLink prefetch="intent" to="/listas">
            {t('footer.account.lists')}
          </NavLink>
        </li>
        {canSeePrices && (
          <li>
            <a href="/api/lista-precios.csv">
              {t('footer.account.price-list')}
            </a>
          </li>
        )}
      </ul>
    </div>
  );
}
