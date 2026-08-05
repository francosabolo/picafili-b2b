import {Price} from '~/components/Price/Price.jsx';
import {Image} from '@shopify/hydrogen';
import styles from './styles.module.scss';
import React, {useEffect, useRef, useState} from 'react';
import {useQuote} from '~/context/QuoteContext.jsx';
import {Button} from '~/components/Button/Button.jsx';
import {IconRemoveItem, IconSuccess, IconError} from '../Icon/Icon';
import QuoteItemActions from '~/components/QuoteItemActions/QuoteItemActions.jsx';
import AvailabilityStatus from '~/components/AvailabilityStatus/AvailabilityStatus.jsx';
import {Text} from '../Text/Text';
import {useTranslation} from '~/i18n/index.jsx';
import {Link, useLocation, useNavigation} from '@remix-run/react';
import {
  getQuoteTotals,
  getLineUnitPrice,
  getPackagingLabel,
} from '~/lib/quote.js';
import {useAccountState} from '~/context/AccountStateContext.jsx';
import {useDiscountContext} from '~/context/DiscountContext.jsx';
import {getEffectiveDiscount, resolveLineDiscounts} from '~/lib/discounts.js';
import {MinimumOrderNotice} from '~/components/Quote/MinimumOrderNotice.jsx';
import {QuoteSubmitForm} from '~/components/Quote/QuoteSubmitForm.jsx';
import {saveList} from '~/lib/saved-lists.js';

const QuoteAside = ({id}) => {
  const {
    quoteItems,
    removeQuoteItem,
    isAsideOpen,
    toggleAside,
    submitQuote,
    quoteResponse,
    setResponse,
    setQuoteEmail,
    setQuotePoNumber,
    clearQuoteItems,
  } = useQuote();
  const basketRef = useRef(null);
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // when redirect to another page close the aside.
    if (isAsideOpen) {
      toggleAside();
    }
  }, [navigation]);

  useEffect(() => {
    // Check if the quote is open.
    const asideID = `#${id}`;
    setIsOpen(location.hash == asideID);
  }, [location]);

  useEffect(() => {
    function handleClickOutside(event) {
      //This is to select the node parents
      const basketParentNode = basketRef?.current?.parentNode.parentNode;
      const closeNode =
        basketRef?.current?.parentNode?.previousSibling?.lastChild;

      if (
        (basketParentNode && !basketParentNode.contains(event?.target)) ||
        closeNode?.contains(event?.target)
      ) {
        if (isOpen) {
          setIsOpen(false);
          setResponse({});
        }
      }
    }

    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [basketRef, isOpen]);

  if (quoteResponse?.type) {
    /// on success or error show this view.
    return (
      <div
        className={`${styles.quoteBasket} ${styles[quoteResponse?.type]}`}
        ref={basketRef}
      >
        <div className={styles.quoteBasketContainer}>
          <div className={styles.msgContainer}>
            <h3>
              {quoteResponse?.type === 'success'
                ? t('quoting.success-title')
                : t('quoting.error-title')}
            </h3>
            {quoteResponse?.type === 'success' && (
              <div className={styles.quoteResponse}>
                {quoteResponse?.message.replace('%1', quoteResponse?.email)}
                <Link to={'/account/quotes'}>{t('quoting.link')}</Link>
              </div>
            )}
            {quoteResponse?.type === 'error' && (
              <div className={styles.quoteResponse}>
                {quoteResponse?.message}
              </div>
            )}
          </div>
          <SubmitButton
            submitQuote={submitQuote}
            quoteResponse={quoteResponse}
            setResponse={setResponse}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          className={`${styles.quoteBasket} ${
            styles[quoteResponse.type] || styles.submit
          }`}
          ref={basketRef}
        >
          {!quoteItems.length && (
            <div
              className={`${styles.quoteBasketContainer} ${styles.emptyQuote}`}
            >
              <div className={styles.msgContainer}>
                <h3 className={styles.noItems}>{t('quoting.no-items')}</h3>
              </div>
            </div>
          )}
          {quoteItems.length > 0 && (
            <>
              <div className={styles.quoteBasketContainer}>
                <BuyingForBand />
                <div className={styles.quoteBasketList}>
                  <ItemsList
                    quoteItems={quoteItems}
                    removeQuoteItem={removeQuoteItem}
                  />
                </div>
                {/* Pie fijo: total, minimo, email y accion quedan siempre a la
                    vista mientras la lista scrollea por detras. */}
                <div className={styles.quoteFooter}>
                  <SubTotals quoteItems={quoteItems} />
                  {/* Mismo formulario que /presupuesto: dos copias se
                      separan solas, y es donde un bug cuesta un pedido. */}
                  <QuoteSubmitForm compact />
                  <FooterActions
                    clearQuoteItems={clearQuoteItems}
                    quoteItems={quoteItems}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
export default QuoteAside;

const SubmitButton = ({submitQuote, quoteResponse, setResponse}) => {
  const [isLoading, setIsLoading] = useState(false);
  const {t} = useTranslation();

  return (
    <Button
      as="button"
      variant="primary"
      width="auto"
      className={`${styles.quoteRequestBtn} ${styles[quoteResponse.type]}`}
      disabled={quoteResponse.type ? 'disabled' : ''}
      onClick={
        //submit quote and set is loading to true;
        async () => {
          setIsLoading(true);
          await submitQuote();
        }
      }
    >
      {!isLoading && (
        <span className={styles.quoteRequestBtnText}>
          <Text>{t('quoting.submit')}</Text>
        </span>
      )}
      {isLoading && (
        <span className={styles.quoteRequestBtnText}>
          <Text>{t('quoting.loading')}</Text>
        </span>
      )}
      {quoteResponse.type === 'success' && (
        <div className={styles.buttonMessage}>
          <IconSuccess className={styles.quoteRequestBtnIcon} />
          <span className={styles.responseText}>
            <Text>{t('quoting.success')}</Text>
          </span>
        </div>
      )}
      {quoteResponse.type === 'error' && (
        <div className={styles.buttonMessage}>
          <IconError
            viewBox="0 0 20 20"
            className={styles.quoteRequestBtnIcon}
          ></IconError>
          <span className={styles.responseText}>
            <Text>{t('quoting.error')}</Text>
          </span>
        </div>
      )}
    </Button>
  );
};
const ItemsList = ({quoteItems, removeQuoteItem}) => {
  const discountContext = useDiscountContext();

  return (
    <ul>
      {quoteItems.map((item, index) => (
        <li className={styles.quoteBasketItem} key={item.id}>
          <QuoteAsideItem
            key={`basket-item` + index}
            item={item}
            removeQuoteItem={removeQuoteItem}
            discountContext={discountContext}
          />
        </li>
      ))}
    </ul>
  );
};

const QuoteAsideItem = ({item, removeQuoteItem, discountContext}) => {
  const {t} = useTranslation();
  // Como se vende: "caja x6 u.". Solo aparece si la tienda configuro bultos.
  const packaging = getPackagingLabel(item);

  const handleRemove = () => {
    removeQuoteItem(item?.id);
  };

  // Total de la línea: un comprador mayorista revisa el subtotal por producto,
  // no el precio unitario — antes solo se mostraba el unitario.
  // Usa el unitario del tramo vigente, no el precio base: con tier prices, un
  // total de línea calculado con el precio de lista no coincide con el pedido.
  // El descuento efectivo se muestra aunque el desglose completo viva en
  // /presupuesto: sin esto el total del drawer bajaba sin explicacion, que es
  // exactamente lo que un comprador mayorista termina preguntando por telefono.
  const effectiveDiscount = getEffectiveDiscount(
    resolveLineDiscounts(item, discountContext),
  );

  const lineTotal = item?.price
    ? {
        amount: (
          getLineUnitPrice(item, discountContext) * Number(item.quantity || 1)
        ).toFixed(2),
        currencyCode: item.price.currencyCode,
      }
    : null;

  return (
    <>
      <Image
        width="48px"
        height="48px"
        src={item?.image?.url}
        alt={item?.image?.altText || 'Producto'}
      />
      <div className={styles.quoteBasketItemAttributes}>
        <span className={styles.itemTitle}>
          {item?.product?.title ?? item?.sku}
        </span>
        <div className={styles.quoteAvailabilityBullet}>
          <span className={styles.itemSku}>{item?.sku}</span>
          {packaging && (
            <span className={styles.itemPackaging}>
              {t('quoting.packaging', {quantity: packaging})}
            </span>
          )}
          <div className={styles.stockBadgeWrapper}>
            <AvailabilityStatus
              availableForSale={item.availableForSale}
              currentlyNotInStock={item.currentlyNotInStock}
            />
          </div>
        </div>
        <QuoteItemActions
          quoteItem={item}
          quantity={item?.quantity}
          key={item.id}
        />
      </div>

      <div className={styles.quoteBasketItemActions}>
        <IconRemoveItem
          onClick={handleRemove}
          className={styles.quoteBasketItemRemove}
          viewBox={'0 0 20 20'}
        />
        <span className={styles.lineTotal}>
          <Price
            className={styles.price}
            data={lineTotal ?? item?.price}
            withoutTrailingZeros
          />
        </span>
        {effectiveDiscount > 0 && (
          <Link className={styles.lineDiscount} to="/presupuesto">
            −{effectiveDiscount}%
          </Link>
        )}
      </div>
    </>
  );
};
const SubTotals = ({quoteItems}) => {
  const {t} = useTranslation();
  const discountContext = useDiscountContext();
  const {subtotal, tax, total, units, taxRate} = getQuoteTotals(
    quoteItems,
    discountContext,
  );

  return (
    <>
      <div className={styles.totalsBlock}>
        <div className={styles.totalsRow}>
          <span>{t('quoting.subtotal', {units})}</span>
          <Price data={subtotal} withoutTrailingZeros />
        </div>
        {/* El impuesto solo se discrimina si el negocio confirmo la alicuota
            (ESTIMATED_TAX_RATE). Sumar 21% sobre un precio que ya lo incluye
            infla el total del pedido. */}
        {tax && (
          <div className={styles.totalsRow}>
            <span>{t('quoting.tax', {rate: Math.round(taxRate * 100)})}</span>
            <Price data={tax} withoutTrailingZeros />
          </div>
        )}
        <div className={`${styles.totalsRow} ${styles.totalsGrand}`}>
          <span>{tax ? t('quoting.total-estimated') : t('quoting.total')}</span>
          <Price data={total} withoutTrailingZeros />
        </div>
      </div>
      {/* Compacto: el mismo aviso ya esta en la barra inferior, que se ve al
          mismo tiempo que el drawer. Repetirlo a tamano completo se comia el
          alto de la lista de items. */}
      <MinimumOrderNotice total={subtotal} compact />
    </>
  );
};

/**
 * "Pedido a nombre de X". En mayorista el pedido se emite a nombre de una
 * empresa, no de una persona: verlo antes de enviar evita el error caro de
 * cargarle el pedido a la cuenta equivocada.
 */
const BuyingForBand = () => {
  const {company} = useAccountState();
  const {t} = useTranslation();

  if (!company) return null;

  return (
    <div className={styles.buyingFor}>
      {t('quoting.buying-for')} <strong>{company}</strong>
    </div>
  );
};

/** Guardar como lista / vaciar. */
const FooterActions = ({clearQuoteItems, quoteItems}) => {
  const {t} = useTranslation();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const nameInputRef = useRef(null);

  // El foco se mueve al input cuando aparece. Va por ref y no por `autoFocus`:
  // el form se monta al hacer click, asi que esto es manejo de foco tras una
  // accion del usuario, no un robo de foco al cargar la pagina.
  useEffect(() => {
    if (naming) nameInputRef.current?.focus();
  }, [naming]);

  // Guardar el pedido como lista de reposicion (E6): el B2B es recompra, no
  // descubrimiento. Se pide nombre porque un comprador maneja varias listas
  // ("reposicion mensual", "temporada"), no una sola.
  //
  // El nombre se pide con un input inline y no con window.prompt: el prompt
  // nativo bloquea el hilo, no se puede estilar y algunos navegadores lo
  // suprimen directamente.
  const handleSave = (event) => {
    event.preventDefault();
    const list = saveList(name, quoteItems, new Date().toISOString());
    if (!list) return;
    setSaved(true);
    setNaming(false);
    setName('');
  };

  if (naming) {
    return (
      <form className={styles.saveListForm} onSubmit={handleSave}>
        <input
          className={styles.saveListInput}
          ref={nameInputRef}
          type="text"
          value={name}
          placeholder={t('lists.name-placeholder')}
          aria-label={t('lists.name-prompt')}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          type="submit"
          className={styles.saveList}
          disabled={!name.trim()}
        >
          {t('lists.confirm-save')}
        </button>
        <button
          type="button"
          className={styles.clearQuote}
          onClick={() => setNaming(false)}
        >
          {t('lists.cancel')}
        </button>
      </form>
    );
  }

  return (
    <div className={styles.footerActions}>
      {saved ? (
        <Link className={styles.saveList} to="/listas">
          {t('lists.saved')}
        </Link>
      ) : (
        <button
          type="button"
          className={styles.saveList}
          onClick={() => setNaming(true)}
        >
          {t('lists.save')}
        </button>
      )}
      <Link className={styles.saveList} to="/presupuesto">
        {t('quote-page.open')}
      </Link>
      <button
        type="button"
        className={styles.clearQuote}
        onClick={clearQuoteItems}
      >
        {t('quoting.clear')}
      </button>
    </div>
  );
};
