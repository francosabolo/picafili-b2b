import {useEffect, useRef} from 'react';
import {useToast} from '~/context/ToastContext.jsx';
import {useTranslation} from '~/i18n/index.jsx';

/**
 * Avisa cuando el carrito **no** pudo llegar a la cantidad pedida.
 *
 * Shopify recorta la cantidad al stock disponible y responde sin errores: la
 * mutación sale bien, el carrito vuelve con menos unidades de las pedidas y la
 * pantalla se queda igual. El comprador toca "+" tres veces, ve el mismo
 * número y no tiene forma de saber si la app está rota o si no hay más
 * mercadería — que son dos conclusiones muy distintas.
 *
 * Se compara lo pedido contra lo que volvió, y si no coincide se dice cuántas
 * unidades hay. Solo dispara en la transición a `idle`: con `fetcher.data`
 * presente en cada render, el aviso saldría una vez por render.
 *
 * @param {object} fetcher fetcher del `CartForm` o de la fila
 * @param {{lineId?: string, requested?: number}} intent
 */
export function useCartQuantityLimit(fetcher, {lineId, requested}) {
  const {push} = useToast();
  const {t} = useTranslation();
  const wasBusy = useRef(false);

  // Lo pedido **en el momento del envío**. Es la corrección de un falso
  // positivo que salía siempre: cuando la respuesta llega, el componente ya se
  // volvió a renderizar con la cantidad nueva, así que `requested` —que se
  // deriva de esa cantidad— vale uno más de lo que se pidió. Comparar contra
  // eso daba "no llegaste al tope" en cada suma exitosa.
  const requestedOnSubmit = useRef(null);

  useEffect(() => {
    if (!fetcher) return;

    if (fetcher.state !== 'idle') {
      if (!wasBusy.current) requestedOnSubmit.current = requested ?? null;
      wasBusy.current = true;
      return;
    }

    if (!wasBusy.current) return;
    wasBusy.current = false;

    const asked = requestedOnSubmit.current;
    requestedOnSubmit.current = null;

    const lines = fetcher.data?.cart?.lines?.nodes;
    if (!Array.isArray(lines) || !lineId || !asked) return;

    const line = lines.find((node) => node?.id === lineId);

    // Sin la línea no hay nada que comparar: o se borró (una baja legítima) o
    // la respuesta no trae líneas.
    if (!line) return;

    const actual = Number(line.quantity);
    if (!Number.isFinite(actual) || actual >= asked) return;

    push({
      title: t('cart.max-quantity'),
      detail: t('cart.max-quantity-detail', {quantity: actual}),
    });
  }, [fetcher?.state, fetcher?.data, lineId, requested, push, t]);
}
