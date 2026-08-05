import {useToast} from '~/context/ToastContext.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {IconCheck, IconClose} from '~/components/Icon/Icon.jsx';
import styles from './styles.module.scss';

/**
 * Los avisos, apilados en una esquina.
 *
 * Se monta una sola vez (en `PageLayout`) y lee del contexto: los botones no
 * renderizan nada, solo empujan.
 *
 * Accesibilidad: el contenedor es `role="status"` con `aria-live="polite"`, así
 * que un lector de pantalla anuncia el alta sin interrumpir lo que esté
 * leyendo. Va con `aria-atomic="false"` para que lea solo el aviso nuevo y no
 * relea la pila entera en cada alta.
 */
export function Toaster() {
  const {toasts, dismiss} = useToast();
  const {t} = useTranslation();

  // Sin avisos no se renderiza la región: un contenedor `aria-live` vacío es
  // ruido para el lector de pantalla y una caja invisible que puede tapar
  // clicks si algún día gana tamaño.
  if (!toasts.length) return null;

  return (
    <div
      className={styles.stack}
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div className={styles.toast} key={toast.id}>
          <span className={styles.icon} aria-hidden="true">
            <IconCheck />
          </span>

          <div className={styles.body}>
            <p className={styles.title}>{toast.title}</p>
            {toast.detail && <p className={styles.detail}>{toast.detail}</p>}
            {toast.actionHref && (
              <a className={styles.action} href={toast.actionHref}>
                {toast.actionLabel}
              </a>
            )}
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={() => dismiss(toast.id)}
            aria-label={t('general.close')}
          >
            <IconClose viewBox="0 0 20 20" />
          </button>
        </div>
      ))}
    </div>
  );
}
