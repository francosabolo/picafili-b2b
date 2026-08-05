import {useEffect, useRef, useState} from 'react';
import {Link} from '@remix-run/react';
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
      <EmailField onChange={setQuoteEmail} />
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

function EmailField({onChange}) {
  const {t} = useTranslation();

  // El email es donde llega el presupuesto: sin etiqueta ni icono se leía como
  // un campo de notas opcional.
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{t('quoting.email-label')}</span>
      <span className={styles.emailControl}>
        <svg
          className={styles.emailIcon}
          viewBox="0 0 20 20"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <rect x="2" y="4" width="16" height="12" rx="2" />
          <path d="m2.5 5.5 7.5 5.5 7.5-5.5" />
        </svg>
        <input
          className={styles.fieldInput}
          name="email"
          type="email"
          required
          placeholder={t('quoting.email-placeholder')}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
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
