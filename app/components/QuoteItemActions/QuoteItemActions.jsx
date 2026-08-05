import React from 'react';
import {useQuote} from '~/context/QuoteContext.jsx';
import styles from './styles.module.scss';
import {useTranslation} from '~/i18n/index.jsx';

const QuoteItemActions = ({quoteItem}) => {
  const {t} = useTranslation();
  const {quoteItems, addQuoteItem, updateQuoteItem, removeQuoteItem} =
    useQuote();

  // La cantidad se deriva del presupuesto, no se copia a estado local: con
  // dos fuentes de verdad el selector terminaba mostrando un número y la nota
  // guardando otro.
  const inQuoteItem = quoteItems.find((item) => item.id === quoteItem.id);
  const isInQuote = Boolean(inQuoteItem);
  const inputQuantity = inQuoteItem?.quantity ?? quoteItem.quantity ?? 1;

  // Mismas reglas de cantidad que el configurador y la compra rápida: sin
  // esto el drawer dejaba bajar de a 1 un producto que se vende por bulto.
  const rule = quoteItem?.quantityRule ?? {};
  const min = Number(rule.minimum) || 1;
  const step = Number(rule.increment) || 1;
  const max = rule.maximum ? Number(rule.maximum) : null;

  const clamp = (value) => {
    const steps = Math.max(0, Math.round((value - min) / step));
    const snapped = min + steps * step;
    return max ? Math.min(snapped, max) : snapped;
  };

  const handleIncrease = () => {
    updateQuoteItem(quoteItem, clamp(inputQuantity + step));
  };

  const handleDecrease = () => {
    // Bajar del mínimo equivale a sacarlo del presupuesto.
    if (inputQuantity - step < min) {
      removeQuoteItem(quoteItem.id);
      return;
    }
    updateQuoteItem(quoteItem, clamp(inputQuantity - step));
  };

  const handleAdd = () => {
    addQuoteItem({...quoteItem, quantity: inputQuantity});
  };

  return (
    <div className={styles.quoteActionsWrapper}>
      {isInQuote ? (
        <div className={styles.quantitySelector}>
          <button onClick={handleDecrease}>-</button>
          <input type="number" value={inputQuantity} readOnly />
          <button onClick={handleIncrease}>+</button>
        </div>
      ) : (
        <button onClick={handleAdd} className={styles.addToQuoteButton}>
          {t('quoting.add-to-quote')}
        </button>
      )}
    </div>
  );
};

export default QuoteItemActions;
