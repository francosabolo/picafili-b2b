import {useEffect, useRef, useState} from 'react';
import {Link} from '@remix-run/react';
import {useRootLoaderData} from '~/lib/root-data.js';
import {useQuote} from '~/context/QuoteContext.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {MAX_PO_LENGTH} from '~/lib/draft-order.js';
import styles from './submitForm.module.scss';

/**
 * Email + orden de compra + enviar.
 *
 * Vive acá y no dentro del drawer porque el presupuesto se puede cerrar desde
 * **dos lugares**: el drawer (camino rápido) y `/presupuesto` (revisión
 * completa). Duplicar el formulario garantizaba que se fueran separando —un
 * arreglo en uno, no en el otro— y es justo el formulario donde un bug se paga
 * con un pedido perdido.
 *
 * @param {{compact?: boolean}}
 */
export function QuoteSubmitForm({compact = false}) {
  const {t} = useTranslation();
  const {submitQuote, quoteResponse, setQuoteEmail, setQuotePoNumber} =
    useQuote();
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSending(true);
    await submitQuote();
    setIsSending(false);
  };

  // Enviado: se muestra el resultado en vez del formulario. Dejar los campos
  // invita a mandarlo dos veces.
  if (quoteResponse?.type === 'success') {
    return (
      <div className={`${styles.result} ${styles.success}`} role="status">
        <strong>{t('quoting.success-title')}</strong>
        <p>
          {quoteResponse.message?.replace('%1', quoteResponse.email ?? '')}
          <Link to="/account/quotes">{t('quoting.link')}</Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className={`${styles.form} ${compact ? styles.compact : ''}`}
      onSubmit={handleSubmit}
    >
      <EmailRecipient onChange={setQuoteEmail} />
      <PoField onChange={setQuotePoNumber} />

      {quoteResponse?.type === 'error' && (
        <p className={`${styles.result} ${styles.error}`} role="alert">
          {quoteResponse.message}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={isSending}>
        {isSending ? t('quoting.loading') : t('quoting.submit')}
      </button>
    </form>
  );
}

/**
 * A dónde llega el presupuesto.
 *
 * **Era un campo de texto obligatorio, y no tenía por qué serlo.** El portal es
 * cerrado: para llegar hasta acá la persona ya inició sesión, así que el email
 * lo sabe el servidor. Pedirlo de nuevo es trabajo para el comprador, un lugar
 * más donde equivocarse de tecla, y —lo peor— hacía que el destinatario del
 * pedido fuera un dato escrito en el navegador en vez de la identidad de la
 * sesión.
 *
 * Se sigue empujando al contexto del presupuesto para no cambiar el payload;
 * el que manda igual es el servidor, que lo pisa con el de la sesión al emitir
 * el draft order.
 *
 * @param {{onChange: (email: string) => void}}
 */
function EmailRecipient({onChange}) {
  const {t} = useTranslation();
  const data = useRootLoaderData();
  const email = data?.customerEmail ?? null;

  useEffect(() => {
    if (email) onChange(email);
  }, [email, onChange]);

  if (!email) {
    // Sin sesión no debería llegar acá, pero si llega, mejor un aviso honesto
    // que un formulario que va a fallar del lado del servidor.
    return <p className={styles.fieldLabel}>{t('quoting.email-missing')}</p>;
  }

  return (
    <p className={styles.recipient}>
      {t('quoting.email-sent-to')} <strong>{email}</strong>
    </p>
  );
}

/**
 * Orden de compra, plegada por defecto.
 *
 * La pide una minoría: los compradores de empresas con circuito de compras
 * formal, donde cuentas a pagar rechaza una factura sin OC y el pedido queda
 * trabado. Para todos los demás sería un campo más entre el email y el botón
 * de enviar.
 */
function PoField({onChange}) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        className={styles.poToggle}
        onClick={() => setOpen(true)}
      >
        {t('quoting.po-toggle')}
      </button>
    );
  }

  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{t('quoting.po-label')}</span>
      <input
        ref={inputRef}
        className={styles.fieldInput}
        name="poNumber"
        type="text"
        maxLength={MAX_PO_LENGTH}
        placeholder={t('quoting.po-placeholder')}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className={styles.fieldHelp}>{t('quoting.po-help')}</span>
    </label>
  );
}
