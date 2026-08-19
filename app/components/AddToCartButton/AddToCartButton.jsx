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
  confirmedLabel,
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

  // La línea que se envía. Con el selector interno apagado —el caso de la
  // tarjeta y de la tabla— manda **el stepper de afuera**, sin pasar por el
  // estado interno: ese estado se sincronizaba por efecto, y cualquier render
  // que llegara en el medio dejaba la cantidad vieja adentro del formulario.
  // El comprador elegía 4 y entraba 1.
  const activeLine = showQuantitySelector
    ? newLine
    : {merchandiseId: productId, quantity: requestedQuantity};

  return (
    <div className={wrapperClassName ?? styles.addToCart}>
      {showQuantitySelector ? <QuantitySelector /> : null}
      <CartForm
        route="/cart"
        inputs={{
          lines: [
            {
              merchandiseId: activeLine.merchandiseId,
              quantity: activeLine.quantity,
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
                quantity={activeLine.quantity}
                productTitle={productTitle}
                merchandiseId={activeLine.merchandiseId}
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
                  // Sin número. Mostraba las unidades que YA hay en el
                  // carrito, al lado de un stepper que muestra las que se van
                  // a agregar: dos números pegados queriendo decir cosas
                  // distintas, y el comprador leía que había elegido 4 y le
                  // habían entrado 1. La cuenta del carrito vive en el ícono
                  // del header, que es donde se la busca.
                  <span className={styles.confirmed}>
                    <IconCheck />
                    {/* El texto del botón NO cambia: la acción sigue siendo
                        agregar —un mayorista suma unidades de tanto en tanto—
                        y un botón que pasa a decir "en el carrito" deja de
                        explicar qué hace al apretarlo. El tilde alcanza para
                        decir que ya hay algo de este producto adentro. */}
                    {confirmedLabel === null
                      ? null
                      : confirmedLabel ?? children}
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
function AddedToCartToast({
  fetcher,
  quantity,
  productTitle,
  merchandiseId,
  onAdded,
}) {
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

    // Que Shopify no devuelva errores NO significa que haya agregado la
    // línea: con una variante sin stock la mutación responde limpia y el
    // carrito vuelve sin esa línea. La prueba de que entró es encontrarla en
    // el carrito que devolvió la respuesta.
    //
    // ⚠️ Pero solo se puede afirmar el fallo **si la respuesta trae líneas**.
    // Cuando no las trae —pasó al principio, porque las mutaciones devuelven
    // un fragmento mínimo— dar por rechazado lo que sí entró es peor que el
    // problema original: el comprador ve un error rojo sobre un producto que
    // está en su carrito. Sin información, se confía en la ausencia de errores.
    const lines = result?.cart?.lines?.nodes;
    const rejected =
      Array.isArray(lines) &&
      !lines.some(
        (node) => node?.merchandise?.id === merchandiseId && node?.quantity > 0,
      );

    if (!result || result.errors?.length || rejected) {
      // El motivo, en la consola del navegador. El aviso que ve el comprador
      // tiene que ser corto y en su idioma; el texto de Shopify sirve para
      // diagnosticar y no para leerlo en una tarjeta.
      if (result?.errors?.length) {
        // eslint-disable-next-line no-console
        console.error('[cart] alta rechazada:', result.errors);
      }

      // Fallo: el boton vuelve a su estado normal en vez de quedar confirmando
      // algo que no paso.
      onAdded?.(false);

      push({
        title: t('cart.add-failed'),
        detail: productTitle
          ? `${productTitle} — ${t('cart.add-failed-detail')}`
          : t('cart.add-failed-detail'),
      });

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
