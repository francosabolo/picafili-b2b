import {createContext, useContext, useMemo, useState} from 'react';
import Cookies from 'js-cookie';
import {useRevalidator} from '@remix-run/react';

/**
 * Máquina de estados de cuenta B2B (épica E2 del backlog).
 *
 * El privilegio no se comunica con adornos: se comunica mostrando lo que
 * todavía no podés ver. Cada estado define qué se ve y qué se puede hacer.
 *
 * HOY el estado sale de una cookie que mueve el switcher de demo. CUANDO
 * exista B2B habilitado en la tienda (épica E3), `resolveAccountState()` pasa
 * a derivarlo de los datos reales del customer y el switcher queda solo como
 * herramienta de demo. El resto de la app no se entera: consume `useAccountState()`.
 */

export const ACCOUNT_STATES = {
  GUEST: 'guest',
  PENDING: 'pending',
  APPROVED: 'approved',
  SALES_REP: 'sales_rep',
};

/**
 * Definición de cada estado. `canSeePrices` y `canOrder` son el contrato que
 * usa el resto de la UI — nunca chequees el string del estado en un componente,
 * preguntá por la capacidad.
 */
export const ACCOUNT_STATE_CONFIG = {
  [ACCOUNT_STATES.GUEST]: {
    id: ACCOUNT_STATES.GUEST,
    label: 'Invitado',
    description: 'Sin sesión. Solo ve el catálogo público, sin precios.',
    canSeePrices: false,
    canOrder: false,
    company: null,
    priceList: null,
  },
  [ACCOUNT_STATES.PENDING]: {
    id: ACCOUNT_STATES.PENDING,
    label: 'Registrado (pendiente)',
    description:
      'Cuenta creada, aún sin aprobar. No ve precios ni puede pedir.',
    canSeePrices: false,
    canOrder: false,
    company: 'Comercio Nuevo',
    priceList: null,
  },
  [ACCOUNT_STATES.APPROVED]: {
    id: ACCOUNT_STATES.APPROVED,
    label: 'Cliente aprobado',
    description: 'Ve precios mayoristas y puede armar el presupuesto.',
    canSeePrices: true,
    canOrder: true,
    company: 'Distribuidora El Sol',
    priceList: 'mayorista-estandar',
  },
  [ACCOUNT_STATES.SALES_REP]: {
    id: ACCOUNT_STATES.SALES_REP,
    label: 'Vendedor',
    description: 'Equipo comercial. Opera el catálogo en nombre de clientes.',
    canSeePrices: true,
    canOrder: true,
    company: 'Distribuidora El Sol',
    priceList: 'mayorista-plus',
    // Modo vendedor es demo visual por decisión de negocio (E14 del backlog):
    // el selector es mock, no hay auth de vendedor ni contexto suplantado real.
    isSalesRep: true,
    repName: 'Carla Méndez',
  },
};

const DEMO_STATE_COOKIE = 'demoAccountState';

const AccountStateContext = createContext(null);

/**
 * @param {{children: React.ReactNode, initialState?: string}}
 */
export function AccountStateProvider({children, initialState, b2b}) {
  const {revalidate} = useRevalidator();
  const [stateId, setStateId] = useState(() => {
    // `initialState` viene del loader (cookie leída en el server). Solo se cae
    // a leer la cookie en el cliente si no llegó: si el primer render del
    // cliente no coincide con el del server, React tira hydration mismatch.
    if (initialState && ACCOUNT_STATE_CONFIG[initialState]) return initialState;
    if (typeof document === 'undefined') return ACCOUNT_STATES.GUEST;

    const saved = Cookies.get(DEMO_STATE_COOKIE);
    return saved && ACCOUNT_STATE_CONFIG[saved] ? saved : ACCOUNT_STATES.GUEST;
  });

  const value = useMemo(() => {
    const config =
      ACCOUNT_STATE_CONFIG[stateId] ??
      ACCOUNT_STATE_CONFIG[ACCOUNT_STATES.GUEST];

    // Si hay company real, manda sobre el estado simulado: el switcher de demo
    // solo gobierna mientras no exista B2B en la tienda.
    const real = b2b
      ? {
          id: ACCOUNT_STATES.APPROVED,
          label: ACCOUNT_STATE_CONFIG[ACCOUNT_STATES.APPROVED].label,
          canSeePrices: true,
          canOrder: true,
          company: b2b.companyName,
          companyId: b2b.companyId,
          locations: b2b.locations,
          activeLocationId: b2b.activeLocationId,
          isReal: true,
        }
      : null;

    return {
      ...config,
      ...(real ?? {}),
      /** Cambia el estado simulado. Solo lo usa el switcher de demo. */
      setAccountState: (nextId) => {
        if (!ACCOUNT_STATE_CONFIG[nextId]) return;
        Cookies.set(DEMO_STATE_COOKIE, nextId, {expires: 7});
        setStateId(nextId);
        // Los precios ahora los filtra el SERVIDOR segun esta cookie, asi que
        // cambiar de estado tiene que volver a pedir los loaders: sin esto,
        // pasar a "cliente aprobado" dejaba la pantalla sin precios hasta
        // recargar a mano.
        revalidate();
      },
    };
  }, [stateId, b2b, revalidate]);

  return (
    <AccountStateContext.Provider value={value}>
      {children}
    </AccountStateContext.Provider>
  );
}

/**
 * Estado de cuenta B2B actual y sus capacidades.
 * @returns {{id: string, label: string, canSeePrices: boolean, canOrder: boolean,
 *   company: string|null, priceList: string|null, isSalesRep?: boolean,
 *   repName?: string, setAccountState: (id: string) => void}}
 */
export function useAccountState() {
  const context = useContext(AccountStateContext);

  if (!context) {
    // Fuera del provider (por ejemplo en un error boundary) el comportamiento
    // seguro es el más restrictivo: invitado.
    return {
      ...ACCOUNT_STATE_CONFIG[ACCOUNT_STATES.GUEST],
      setAccountState: () => {},
    };
  }

  return context;
}
