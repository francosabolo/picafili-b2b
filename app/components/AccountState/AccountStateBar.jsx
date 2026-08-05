import {useState} from 'react';
import {
  ACCOUNT_STATE_CONFIG,
  ACCOUNT_STATES,
  useAccountState,
} from '~/context/AccountStateContext.jsx';
import {DEMO_ROLE_SWITCHER} from '~/lib/const.js';
import styles from './styles.module.scss';

/**
 * Barra superior de la zona mayorista: mensaje permanente + switcher de demo.
 *
 * El switcher es una herramienta de demo (E2 del backlog): permite mostrar los
 * cuatro estados sin necesidad de tener companies reales cargadas en Shopify.
 * Se apaga con DEMO_ROLE_SWITCHER — en una tienda de cara al público va en false.
 */
export function AccountStateBar() {
  const {id, label, setAccountState} = useAccountState();
  const [isOpen, setOpen] = useState(false);

  return (
    <div className={styles.bar}>
      <span className={styles.claim}>
        Plataforma mayorista — pedidos exclusivos para clientes registrados
      </span>

      {DEMO_ROLE_SWITCHER && (
        <div className={styles.switcher}>
          <button
            type="button"
            className={styles.switcherToggle}
            onClick={() => setOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <span className={styles.switcherLabel}>Ver como:</span>
            <strong>{label}</strong>
            <span className={styles.caret} aria-hidden="true">
              ▾
            </span>
          </button>

          {isOpen && (
            <div className={styles.menu} role="listbox">
              <div className={styles.menuHeading}>
                <strong>Previsualizar estado de usuario</strong>
                <span>
                  Herramienta de demo para inspeccionar la visibilidad por rol.
                </span>
              </div>
              {Object.values(ACCOUNT_STATES).map((stateId) => {
                const option = ACCOUNT_STATE_CONFIG[stateId];
                const isSelected = stateId === id;

                return (
                  <button
                    type="button"
                    key={stateId}
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.option} ${
                      isSelected ? styles.optionSelected : ''
                    }`}
                    onClick={() => {
                      setAccountState(stateId);
                      setOpen(false);
                    }}
                  >
                    <span className={styles.optionLabel}>{option.label}</span>
                    <span className={styles.optionDescription}>
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Modo vendedor: barra "Comprando para: X".
 * Demo visual por decisión de negocio (E14) — el selector no cambia contexto real.
 */
export function SalesRepBar() {
  const {isSalesRep, company, priceList} = useAccountState();

  if (!isSalesRep) return null;

  return (
    <div className={styles.repBar}>
      <span className={styles.repMode}>Modo vendedor</span>
      <div className={styles.repTarget}>
        <span>Comprando para:</span>
        <strong>{company}</strong>
        <span className={styles.repBadge}>{priceList}</span>
      </div>
    </div>
  );
}
