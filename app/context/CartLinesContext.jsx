import {createContext, useContext, useEffect, useMemo, useState} from 'react';

/**
 * Qué hay en el carrito, accesible desde cualquier botón.
 *
 * **Por qué hace falta.** El carrito llega al layout como una promesa y se
 * resuelve dentro de un `<Await>` que solo envuelve al drawer. Un botón de
 * "agregar" que vive en una tarjeta del listado no tiene forma de saber si su
 * producto ya está adentro — y sin saberlo, lo único que puede mostrar es un
 * aviso que se apaga solo.
 *
 * Eso era el comportamiento anterior: el tilde duraba dos segundos y despues el
 * botón volvía a su estado inicial, o sea que la tarjeta **mentía**: decía "no
 * agregado" sobre un producto que estaba en el carrito. En un catálogo mayorista
 * se cargan quince productos seguidos y la pregunta no es "¿anduvo?" sino
 * "¿cuáles ya puse?".
 *
 * Ahora el estado del botón es un reflejo del carrito, igual que
 * "Presupuestar" refleja el presupuesto: si el producto está, el botón lo dice,
 * y lo sigue diciendo.
 *
 * **Por qué un contexto y no envolver el layout en Suspense.** Envolver todo en
 * el `<Await>` haría que la página entera espere al carrito o muestre un
 * fallback, y se pierde el streaming. Con esto, el layout renderiza como hasta
 * ahora y el carrito se empuja al contexto cuando resuelve.
 */

const CartLinesContext = createContext(null);

const EMPTY = Object.freeze({});

export function CartLinesProvider({children}) {
  const [quantities, setQuantities] = useState(EMPTY);

  const value = useMemo(
    () => ({quantities, setQuantities}),
    [quantities, setQuantities],
  );

  return (
    <CartLinesContext.Provider value={value}>
      {children}
    </CartLinesContext.Provider>
  );
}

/**
 * Empuja el carrito resuelto al contexto. Va DENTRO del `<Await>` que ya
 * existe: no renderiza nada, solo sincroniza.
 *
 * @param {{cart: object|null}}
 */
export function CartLinesSync({cart}) {
  const context = useContext(CartLinesContext);
  const setQuantities = context?.setQuantities;

  // `cart.totalQuantity` como dependencia además de las líneas: alcanza para
  // detectar altas, bajas y cambios de cantidad sin volver a mapear en cada
  // render del layout.
  const lines = cart?.lines?.nodes;
  const totalQuantity = cart?.totalQuantity;

  useEffect(() => {
    if (!setQuantities) return;

    const next = {};
    for (const line of lines ?? []) {
      const id = line?.merchandise?.id;
      if (!id) continue;
      next[id] = (next[id] ?? 0) + (Number(line.quantity) || 0);
    }
    setQuantities(next);
  }, [lines, totalQuantity, setQuantities]);

  return null;
}

/**
 * Cuántas unidades de esta variante hay en el carrito. 0 si no está.
 *
 * Fuera del provider devuelve 0: un botón que no sabe muestra el estado
 * inicial, que es el comportamiento seguro.
 *
 * @param {string} merchandiseId
 * @returns {number}
 */
export function useCartQuantity(merchandiseId) {
  const context = useContext(CartLinesContext);
  if (!context || !merchandiseId) return 0;
  return context.quantities[merchandiseId] ?? 0;
}
