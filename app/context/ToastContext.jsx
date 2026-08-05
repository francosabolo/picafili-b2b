import {createContext, useCallback, useContext, useMemo, useState} from 'react';

/**
 * Avisos efímeros de "esto que hiciste, salió".
 *
 * **El problema.** Agregar al carrito desde una tarjeta no devolvía ninguna
 * señal: el botón quedaba igual, la página no se movía y el contador del header
 * cambiaba de un dígito arriba a la derecha, fuera del campo visual de quien
 * está mirando la tarjeta. En un catálogo mayorista se agregan quince
 * productos seguidos, así que la duda no es "¿anduvo?" una vez, es "¿cuáles ya
 * agregué?" quince veces — y la respuesta era volver a abrir el carrito.
 *
 * **Por qué un aviso y no abrir el carrito.** Abrir el drawer en cada alta
 * interrumpe justamente el flujo que hace valioso al portal: recorrer y cargar
 * sin parar. El aviso confirma sin sacar a nadie de donde está, y ofrece el
 * camino al carrito para quien sí quiera ir.
 *
 * Vive en un contexto y no en cada botón porque los avisos se apilan: veinte
 * botones con su propio aviso serían veinte cajas peleando por la misma
 * esquina.
 */

const ToastContext = createContext(null);

/** Cuánto queda en pantalla. Suficiente para leer dos líneas sin apurarse. */
const DISMISS_MS = 4000;

/**
 * Cuántos se ven a la vez.
 *
 * Con el resto se descartan los más viejos: quien agrega diez productos
 * seguidos no necesita diez confirmaciones apiladas, necesita saber que las
 * últimas entraron.
 */
const MAX_VISIBLE = 3;

export function ToastProvider({children}) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      // `id` a partir de un contador y no de Date.now(): dos altas en el mismo
      // milisegundo compartirían key y React reusaría el nodo, cortando la
      // animación de una de las dos.
      const id = nextId();
      setToasts((current) => [
        ...current.slice(-(MAX_VISIBLE - 1)),
        {...toast, id},
      ]);

      if (typeof window !== 'undefined') {
        window.setTimeout(() => dismiss(id), DISMISS_MS);
      }

      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({toasts, push, dismiss}),
    [toasts, push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

let counter = 0;
function nextId() {
  counter += 1;
  return `toast-${counter}`;
}

/**
 * Fuera del provider devuelve un `push` que no hace nada, a propósito: un aviso
 * que no aparece es un problema menor que una pantalla que no renderiza.
 */
export function useToast() {
  return (
    useContext(ToastContext) ?? {toasts: [], push: () => {}, dismiss: () => {}}
  );
}
