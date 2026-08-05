import {createContext, useContext} from 'react';
import {EMPTY_DISCOUNT_CONTEXT} from '~/lib/discounts.js';

/**
 * Descuentos que NO vienen del pedido: los del acuerdo comercial del cliente y
 * los de la categoría del producto.
 *
 * Vive en un contexto de React y no en la línea del presupuesto por dos razones
 * distintas, y las dos importan:
 *
 * 1. **Granularidad.** El descuento del acuerdo es del cliente, no de la línea.
 *    Guardarlo en cada línea lo congelaría en la cookie, y un cambio de acuerdo
 *    no se reflejaría en un presupuesto ya armado.
 * 2. **Confianza.** La cookie la escribe el navegador. Un porcentaje que llega
 *    del cliente y toca el precio es plata que se regala. Este contexto se
 *    resuelve en el servidor y baja por el loader del root, que además lo pasa
 *    por el mismo gate que los precios.
 *
 * Fuera del provider devuelve el contexto vacío: sin descuentos. El
 * comportamiento seguro es siempre el más restrictivo.
 */
const DiscountContext = createContext(EMPTY_DISCOUNT_CONTEXT);

/**
 * @param {{children: React.ReactNode, value?: object}}
 */
export function DiscountContextProvider({children, value}) {
  return (
    <DiscountContext.Provider value={value ?? EMPTY_DISCOUNT_CONTEXT}>
      {children}
    </DiscountContext.Provider>
  );
}

export function useDiscountContext() {
  return useContext(DiscountContext) ?? EMPTY_DISCOUNT_CONTEXT;
}
