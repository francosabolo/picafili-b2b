import React, {useEffect, useRef, useState} from 'react';
import {ENABLE_CART} from '~/lib/const.js';
import {AddToCartButton} from '~/components/AddToCartButton/AddToCartButton.jsx';
import {IconCartPlus} from '~/components/Icon/Icon.jsx';
import {useQuote} from '~/context/QuoteContext.jsx';
import styles from './styles.module.scss';
import {IconClose, IconAccount, IconArrow} from '../Icon/Icon';
import {NavLink} from 'react-router-dom';
import {useTranslation} from '~/i18n/index.jsx';
import {ConsultButton} from '~/components/ConsultButton/ConsultButton';
import {
  ACCOUNT_STATES,
  useAccountState,
} from '~/context/AccountStateContext.jsx';

export const QuoteItemActions = ({
  quoteItem,
  viewport,
  sku,
  stacked,
  compact,
}) => {
  const {quoteItems, addQuoteItem, updateQuoteItem, removeQuoteItem} =
    useQuote();
  const [selectorIsOpen, setSelectorIsOpen] = useState(false);
  const [selectorIsHidden, setSelectorIsHidden] = useState(false);
  const [inputQuantity, setInputQuantity] = useState(1);
  const [animation, setAnimation] = useState();
  const {canOrder, id: accountStateId} = useAccountState();
  const {t} = useTranslation();

  useEffect(() => {
    const existingItem = quoteItems.find((item) => item.id === quoteItem.id);
    if (existingItem) {
      setSelectorIsOpen(true);
      setAnimation(
        viewport === 'mobile'
          ? styles.openSelectorMobile
          : styles.openSelectorDesktop,
      );
      return;
    }
    setSelectorIsOpen(false);
  }, [quoteItems]);

  // Este efecto empujaba `inputQuantity` al presupuesto en cada montaje. Con
  // un ítem ya cargado en 5, al volver a renderizar la fila lo reseteaba a 1
  // en silencio. Ahora solo corre si el usuario tocó el selector.
  const userChangedQuantity = useRef(false);

  useEffect(() => {
    if (!userChangedQuantity.current) return;
    updateQuoteItem(quoteItem, inputQuantity);
  }, [inputQuantity]);

  function toggleSelector() {
    if (selectorIsHidden) {
      return;
    }
    if (viewport === 'mobile') {
      setAnimation(
        animation === styles.openSelectorMobile
          ? styles.closeSelectorMobile
          : styles.openSelectorMobile,
      );
    } else {
      setAnimation(
        animation === styles.openSelectorDesktop
          ? styles.closeSelectorDesktop
          : styles.openSelectorDesktop,
      );
    }
    setSelectorIsOpen(!selectorIsOpen);
  }

  const handleIncrease = () => {
    userChangedQuantity.current = true;
    setInputQuantity(inputQuantity + 1);
  };

  const handleDecrease = () => {
    userChangedQuantity.current = true;
    if (inputQuantity === 1) {
      toggleSelector();
      setSelectorIsOpen(false);
      removeQuoteItem(quoteItem.id);
      return;
    }
    setInputQuantity(inputQuantity - 1);
  };

  const deleteItem = () => {
    toggleSelector();
    setSelectorIsOpen(false);
    removeQuoteItem(quoteItem.id);
    setInputQuantity(1);
  };

  const backArrow = () => {
    setSelectorIsHidden(true);
    setAnimation(styles.closeSelectorMobile);
    setSelectorIsOpen(false);
  };

  const handleAdd = () => {
    const currentProduct = {...quoteItem};
    const isInQuote = !!quoteItems.find(
      (item) => item.id === currentProduct.id,
    );

    if (selectorIsHidden && isInQuote) {
      setAnimation(styles.openSelectorMobile);
      setSelectorIsOpen(true);
      setSelectorIsHidden(false);
      return;
    }
    toggleSelector();
    if (inputQuantity > 1) {
      setInputQuantity(inputQuantity + 1);
    } else {
      addQuoteItem({...quoteItem, quantity: inputQuantity});
    }
  };

  function SignInButton({pendingApproval}) {
    const singInButtonCopy = pendingApproval
      ? t('general.pending-approval')
      : t('general.sign-in');

    return (
      <>
        <button className={styles.signInButton}>
          <NavLink
            prefetch="intent"
            to="/account"
            className={
              viewport === 'mobile' ? styles.mobileSignIn : styles.desktopSignIn
            }
          >
            {viewport === 'mobile' ? (
              <IconAccount
                className={styles.icon}
                width="22"
                height="24"
                viewBox="0 -4 20 29"
              />
            ) : (
              <span>{singInButtonCopy}</span>
            )}
          </NavLink>
        </button>
        {!pendingApproval && (
          <ConsultButton viewport={viewport} product={quoteItem} />
        )}
      </>
    );
  }

  // Gating de pedido (E2): quien no está aprobado no puede armar la nota.
  // Se le ofrece el camino en su lugar — iniciar sesión, o esperar la aprobación.
  if (!canOrder) {
    // "Iniciar sesión" solo tiene sentido para quien NO la tiene — y en este
    // portal eso solo pasa si `REQUIRE_LOGIN` se apaga. A un cliente logueado
    // que todavía no puede pedir le ofrecíamos iniciar sesión otra vez: el
    // botón lo devolvía a la misma pantalla, sin explicar nada.
    const pendingApproval = accountStateId !== ACCOUNT_STATES.GUEST;

    // En la tabla comparativa el CTA ancho no entra en la celda —se salia por
    // los dos lados— y ademas repetia el mismo mensaje en cada una de las doce
    // filas. La pagina ya lo dice una vez arriba, en el banner de estado de
    // cuenta: aca alcanza con un link corto.
    if (compact) {
      return (
        <NavLink
          prefetch="intent"
          to="/account"
          className={styles.compactSignIn}
        >
          {pendingApproval
            ? t('general.pending-approval')
            : t('general.sign-in')}
        </NavLink>
      );
    }

    return (
      <div className={`${styles.quoteActionsWrapper} ${styles[viewport]}`}>
        <SignInButton pendingApproval={pendingApproval} />
      </div>
    );
  }

  // Desktop: layout de quick order — cantidad SIEMPRE visible al lado del
  // botón, en vez del swap animado que escondía uno u otro. Un mayorista
  // decide cantidad y agrega en un solo gesto; no quiere descubrir el stepper
  // después de haber agregado una unidad.
  if (viewport !== 'mobile') {
    const inQuoteItem = quoteItems.find((item) => item.id === quoteItem.id);
    const isInQuote = Boolean(inQuoteItem);

    // Reglas de cantidad del catálogo B2B (E5). Sin catálogos configuradas
    // valen los defaults de Shopify: mínimo 1, sin máximo, de a 1.
    const rule = quoteItem?.quantityRule ?? {};
    const min = Number(rule.minimum) || 1;
    const step = Number(rule.increment) || 1;
    const max = rule.maximum ? Number(rule.maximum) : null;
    const sellsByBulk = step > 1 || min > 1;

    /** Ajusta al múltiplo válido más cercano dentro del rango permitido. */
    const clamp = (value) => {
      const steps = Math.max(0, Math.round((value - min) / step));
      const snapped = min + steps * step;
      return max ? Math.min(snapped, max) : snapped;
    };

    // Con el ítem ya en el presupuesto, el selector muestra y edita la cantidad
    // real de la nota. Antes tenía su propio estado local: sumabas desde el
    // botón y el número de la izquierda seguía en 1, mintiendo.
    const displayQuantity = isInQuote ? inQuoteItem.quantity : inputQuantity;

    const setQuantity = (next) => {
      const value = clamp(next);
      if (isInQuote) {
        updateQuoteItem(quoteItem, value);
      } else {
        setInputQuantity(value);
      }
    };

    return (
      <div
        className={`${styles.quoteActionsWrapper} ${styles.quickOrderRow} ${
          stacked ? styles.stacked : ''
        }`}
      >
        <div className={styles.quantitySelector}>
          <button
            type="button"
            onClick={() => setQuantity(displayQuantity - step)}
            aria-label={t('quoting.decrease')}
          >
            −
          </button>
          <input
            type="number"
            min={min}
            step={step}
            value={displayQuantity}
            aria-label={t('cart.quantity')}
            onChange={(event) => setQuantity(Number(event.target.value) || min)}
          />
          <button
            type="button"
            onClick={() => setQuantity(displayQuantity + step)}
            aria-label={t('quoting.increase')}
          >
            +
          </button>
        </div>

        <button
          type="button"
          className={`${styles.addToQuoteButton} ${
            isInQuote ? styles.inQuote : ''
          }`}
          onClick={() => addQuoteItem({...quoteItem, quantity: inputQuantity})}
        >
          {isInQuote
            ? `${t('quoting.in-quote')} ${displayQuantity}`
            : t('quoting.add-to-quote')}
        </button>

        {sellsByBulk && (
          <span className={styles.bulkNote}>
            {step > 1
              ? t('quoting.bulk-step', {step})
              : t('quoting.bulk-min', {min})}
          </span>
        )}

        {isInQuote && (
          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => removeQuoteItem(quoteItem.id)}
            aria-label={t('quoting.remove-from-quote')}
          >
            <IconClose viewBox="0 0 20 20"></IconClose>
          </button>
        )}

        {/* Compra directa como accion SECUNDARIA, con la cantidad elegida en
            el mismo selector. Presupuesto y carrito CONVIVEN: el presupuesto
            es para lo que se negocia, el carrito para lo que ya tiene precio
            cerrado. Solo si la tienda habilito el carrito. */}
        {ENABLE_CART && quoteItem?.availableForSale && (
          <AddToCartButton
            lines={[{merchandiseId: quoteItem.id, quantity: displayQuantity}]}
            buttonClassName={styles.cartButton}
            wrapperClassName={styles.cartButtonWrap}
            title={t('cart.add')}
            productTitle={quoteItem?.product?.title}
            addedClassName={styles.cartButtonAdded}
          >
            <IconCartPlus />
            <span className={styles.srOnly}>{t('cart.add')}</span>
          </AddToCartButton>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.quoteActionsWrapper} ${styles[viewport]}`}>
      <>
        <div
          className={styles.quantitySelectorWrapper}
          style={
            viewport === 'mobile'
              ? {
                  animationName: !selectorIsHidden
                    ? animation
                    : styles.closeSelectorMobile,
                  visibility:
                    selectorIsOpen && !selectorIsHidden ? 'visible' : 'hidden',
                  animationDuration: '0.5s',
                }
              : {}
          }
        >
          {viewport === 'mobile' && (
            <button className={styles.backArrow} onClick={backArrow}>
              <IconArrow viewBox="0 0 24 24" fill="transparent"></IconArrow>
            </button>
          )}
          {(selectorIsOpen || viewport === 'mobile') && (
            <div className={styles.quantitySelector}>
              <button onClick={handleDecrease}>-</button>
              <input type="number" value={inputQuantity} readOnly />
              <button onClick={handleIncrease}>+</button>
            </div>
          )}
          <button className={styles.deleteButton} onClick={deleteItem}>
            <IconClose viewBox="0 0 20 20"></IconClose>
          </button>
        </div>
        <button
          className={styles.addToQuoteButton}
          onClick={handleAdd}
          style={
            viewport === 'desktop'
              ? {
                  animationName: animation,
                  visibility: selectorIsOpen ? 'hidden' : 'visible',
                }
              : {
                  visibility:
                    selectorIsOpen && !selectorIsHidden ? 'hidden' : 'visible',
                }
          }
        >
          {viewport === 'mobile' ? '+' : t('quoting.add-to-quote')}
        </button>
      </>
    </div>
  );
};
