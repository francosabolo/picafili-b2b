import {CartForm} from '@shopify/hydrogen';
import {useToast} from '~/context/ToastContext.jsx';
import {useCartQuantity} from '~/context/CartLinesContext.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import styles from './styles.module.scss';
import {useState, useEffect, useRef} from 'react';
import {Text} from '../Text/Text';
import {IconCheck} from '~/components/Icon/Icon.jsx';

/**
 * @param {{
 *   analytics?: unknown;
 *   children: React.ReactNode;
 *   disabled?: boolean;
 *   lines: CartLineInput[];
 *   onClick?: () => void;
 * }}
 */
export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  showQuantitySelector = false,
  buttonClassName,
  wrapperClassName,
  title,
  productTitle,
  addedClassName,
}) {
  // Confirmacion EN EL BOTON, ademas del aviso.
  //
  // El aviso aparece abajo a la derecha y el click pasa en la tarjeta: el ojo
  // no esta ahi. El boton tiene que responder donde se lo toco, igual que
  // "Presupuestar" cambia a "Agregado: N" sin esperar a nadie.
  //
  // Arranca en el submit y NO cuando responde Shopify: entre una cosa y otra
  // hay una vuelta de red, y un boton que no hace nada durante medio segundo
  // se vuelve a apretar. Si la respuesta trae error se vuelve al estado normal
  // (ver mas abajo), asi que el optimismo no llega a mentir.
  const [justAdded, setJustAdded] = useState(false);
  const productId = lines[0].merchandiseId;
  const requestedQuantity = lines[0].quantity ?? 1;

  // Cuantas unidades de esta variante hay YA en el carrito. Es la fuente del
  // estado persistente: mientras el producto este adentro, el boton lo dice.
  const inCart = useCartQuantity(productId);

  const [newLine, setNewLine] = useState({
    merchandiseId: productId,
    quantity: requestedQuantity,
  });

  // La cantidad la elige el stepper de AFUERA: la tarjeta, la fila de la tabla
  // o el configurador de la ficha. Este estado arrancaba siempre en 1 y no
  // volvia a mirar `lines`, asi que el comprador elegia 6 unidades, tocaba el
  // carrito y le entraba 1 — sin ningun aviso. El selector interno
  // (`showQuantitySelector`) sigue mandando cuando esta encendido.
  useEffect(() => {
    setNewLine({merchandiseId: productId, quantity: requestedQuantity});
  }, [productId, requestedQuantity]);

  function QuantitySelector() {
    function UpdateQuantity(element, action) {
      let newQuantity = 1;

      if (action === 'update') {
        newQuantity = element.target.value;
      } else if (action === 'add') {
        newQuantity = newLine.quantity + 1;
      } else if (action === 'decrease') {
        newQuantity =
          newLine.quantity > 1 ? newLine.quantity - 1 : newLine.quantity;
      }

      setNewLine({
        merchandiseId: productId,
        quantity: newQuantity,
      });
    }

    return (
      <div className={styles.quantitySelector}>
        <button
          className={styles.qtyAction}
          onClick={(e) => UpdateQuantity(e, 'decrease')}
        >
          -
        </button>
        <input
          onChange={(e) => UpdateQuantity(e, 'update')}
          value={newLine.quantity}
        ></input>
        <button
          className={styles.qtyAction}
          onClick={(e) => UpdateQuantity(e, 'add')}
        >
          +
        </button>
      </div>
    );
  }

  function resetQuantity() {
    setNewLine({
      merchandiseId: productId,
      quantity: 1,
    });
  }

  return (
    <div className={wrapperClassName ?? styles.addToCart}>
      {showQuantitySelector ? <QuantitySelector /> : null}
      <CartForm
        route="/cart"
        inputs={{
          lines: [
            {
              merchandiseId: newLine.merchandiseId,
              quantity: newLine.quantity,
            },
          ],
        }}
        action={CartForm.ACTIONS.LinesAdd}
      >
        {(fetcher) => {
          const busy = fetcher.state !== 'idle';
          // `justAdded` cubre la ventana entre el click y el momento en que
          // el carrito revalida; `inCart` lo sostiene despues, sin limite.
          // Antes estaba solo el primero, con un timeout de 2s: pasado ese
          // rato la tarjeta volvia a decir "no agregado" sobre un producto que
          // SI estaba en el carrito.
          const confirming = busy || justAdded || inCart > 0;

          return (
            <>
              <AddedToCartToast
                fetcher={fetcher}
                quantity={newLine.quantity}
                productTitle={productTitle}
                onAdded={setJustAdded}
              />
              <input
                name="analytics"
                type="hidden"
                value={JSON.stringify(analytics)}
              />
              {/* `buttonClassName` estaba declarado como prop y no se usaba en
                ningun lado: quien lo pasaba no obtenia nada. */}
              <button
                type="submit"
                className={`${buttonClassName ?? ''} ${
                  confirming ? addedClassName ?? '' : ''
                }`}
                title={title}
                disabled={disabled ?? busy}
              >
                {confirming ? (
                  <span className={styles.confirmed}>
                    <IconCheck />
                    {inCart > 0 && (
                      <span className={styles.confirmedCount}>{inCart}</span>
                    )}
                  </span>
                ) : children ? (
                  children
                ) : (
                  <Text as="span" className={`${styles.AddToCartButton}`}>
                    +Agregar
                  </Text>
                )}
              </button>
            </>
          );
        }}
      </CartForm>
    </div>
  );
}

/**
 * Avisa cuando el alta al carrito termino bien.
 *
 * Escucha el `fetcher` del `CartForm` en vez de disparar en el click: el click
 * solo dice que se pidio, no que Shopify lo aceptara. Una variante sin stock o
 * una regla de cantidad violada devuelven error y ahi no hay nada que
 * confirmar — confirmar de antemano seria mentir.
 *
 * Se dispara en la transicion a `idle` con datos, no en cada render con
 * `fetcher.data` presente: ese dato queda pegado despues de resolver y
 * dispararia un aviso en cada re-render de la tarjeta.
 */
function AddedToCartToast({fetcher, quantity, productTitle, onAdded}) {
  const {push} = useToast();
  const {t} = useTranslation();
  const wasBusy = useRef(false);

  useEffect(() => {
    const busy = fetcher.state !== 'idle';

    if (busy) {
      wasBusy.current = true;
      return;
    }

    if (!wasBusy.current) return;
    wasBusy.current = false;

    // `errors` lo devuelve la accion del carrito cuando Shopify rechaza la
    // linea. Sin resultado tampoco hay nada que confirmar.
    const result = fetcher.data;
    if (!result || result.errors?.length) {
      // Fallo: el boton vuelve a su estado normal en vez de quedar confirmando
      // algo que no paso.
      onAdded?.(false);
      return;
    }

    onAdded?.(true);
    // Vuelve solo. Un tilde permanente convertiria la tarjeta en un registro de
    // lo que ya agregaste, que es trabajo del carrito, no del boton.
    window.setTimeout(() => onAdded?.(false), 2000);

    push({
      title: t('cart.added'),
      detail: productTitle
        ? `${quantity} × ${productTitle}`
        : t('cart.added-detail', {quantity}),
      actionHref: '#cart-aside',
      actionLabel: t('cart.view'),
    });
  }, [fetcher.state, fetcher.data]);

  return null;
}
