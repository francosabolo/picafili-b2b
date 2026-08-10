import {createContext, useContext, useMemo, useState} from 'react';
import Cookies from 'js-cookie';
import {useRevalidator} from '@remix-run/react';
import {DEMO_ROLE_SWITCHER} from '~/lib/const.js';

/**
 * Máquina de estados de cuenta B2B (épica E2 del backlog).
 *
 * El privilegio no se comunica con adornos: se comunica mostrando lo que
 * todavía no podés ver. Cada estado define qué se ve y qué se puede hacer.
 *
 * El estado sale de los **datos** (`resolveRealState`): company del cliente y
 * si hay sesión. El switcher de demo solo gobierna cuando `DEMO_ROLE_SWITCHER`
 * está encendido y no hay company real — y mientras se lo miraba siempre, una
 * cookie vieja pintaba "Cuenta aprobada · Distribuidora El Sol" arriba de la
 * pantalla que decía que la cuenta estaba en revisión.
 *
 * ⚠️ Esto es la CARA del permiso, no el permiso. Quién ve precios lo decide el
 * servidor en `price-gating.server.js`, y quién entra, `access.server.js`. Un
 * componente pregunta por la capacidad (`canSeePrices`, `canOrder`), nunca por
 * el string del estado.
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
 * Estado REAL, derivado de los datos y no de una cookie.
 *
 * Los tres casos del portal cerrado, en orden de privilegio: contacto de una
 * company, sesión sin company todavía, y nadie. Devuelve la forma completa —
 * incluidos `company` y `priceList` en `null`— para no heredar los valores de
 * demo de `ACCOUNT_STATE_CONFIG` ("Distribuidora El Sol", "Comercio Nuevo"),
 * que son datos inventados y no de esta persona.
 *
 * @param {{companyName?: string, companyId?: string, hasBuyerContext?: boolean}|null} b2b
 * @param {boolean} loggedIn
 */
function resolveRealState(b2b, loggedIn) {
  if (b2b?.companyId) {
    return {
      ...ACCOUNT_STATE_CONFIG[ACCOUNT_STATES.APPROVED],
      // Los precios se piden en el contexto de la company. Si ese contexto no
      // está armado, el servidor NO manda importes (ver price-gating.server.js)
      // y la UI tiene que decir lo mismo: si acá dijera `true`, se dibujarían
      // los espacios de precio vacíos de una página que nunca los va a tener.
      canSeePrices: Boolean(b2b.hasBuyerContext),
      canOrder: Boolean(b2b.hasBuyerContext),
      company: b2b.companyName ?? null,
      companyId: b2b.companyId,
      locations: b2b.locations,
      activeLocationId: b2b.activeLocationId,
      priceList: null,
      isReal: true,
    };
  }

  if (loggedIn) {
    return {
      ...ACCOUNT_STATE_CONFIG[ACCOUNT_STATES.PENDING],
      company: null,
      isReal: true,
    };
  }

  return {...ACCOUNT_STATE_CONFIG[ACCOUNT_STATES.GUEST], isReal: true};
}

/**
 * @param {{children: React.ReactNode, initialState?: string, b2b?: object|null, loggedIn?: boolean}}
 */
export function AccountStateProvider({children, initialState, b2b, loggedIn}) {
  const {revalidate} = useRevalidator();
  const [stateId, setStateId] = useState(() => {
    // Sin switcher no hay estado simulado que recordar, y sobre todo no se
    // mira la cookie: una `demoAccountState` vieja seguía diciendo "cliente
    // aprobado" en un portal donde el permiso lo da la company.
    if (!DEMO_ROLE_SWITCHER) return ACCOUNT_STATES.GUEST;

    // `initialState` viene del loader (cookie leída en el server). Solo se cae
    // a leer la cookie en el cliente si no llegó: si el primer render del
    // cliente no coincide con el del server, React tira hydration mismatch.
    if (initialState && ACCOUNT_STATE_CONFIG[initialState]) return initialState;
    if (typeof document === 'undefined') return ACCOUNT_STATES.GUEST;

    const saved = Cookies.get(DEMO_STATE_COOKIE);
    return saved && ACCOUNT_STATE_CONFIG[saved] ? saved : ACCOUNT_STATES.GUEST;
  });

  const value = useMemo(() => {
    const real = resolveRealState(b2b, loggedIn);

    // El switcher es una herramienta de demo: gobierna solo mientras esté
    // encendido Y no haya company real. Con `DEMO_ROLE_SWITCHER` en false, el
    // estado sale enteramente de los datos.
    const config =
      DEMO_ROLE_SWITCHER && !b2b?.companyId
        ? ACCOUNT_STATE_CONFIG[stateId] ??
          ACCOUNT_STATE_CONFIG[ACCOUNT_STATES.GUEST]
        : real;

    return {
      ...config,
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
  }, [stateId, b2b, loggedIn, revalidate]);

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
