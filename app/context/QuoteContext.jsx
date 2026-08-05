import React, {createContext, useContext, useEffect, useState} from 'react';
import {json} from '@shopify/remix-oxygen';
import {useTranslation} from '~/i18n/index.jsx';
import {getQuoteTotal, toQuoteLine} from '~/lib/quote.js';
import {clampDiscount} from '~/lib/discounts.js';
import {
  clearQuoteStorage,
  loadQuoteItems,
  saveQuoteItems,
} from '~/lib/quote-storage.js';

// Create a context with default values
const QuoteContext = createContext();

export const QuoteProvider = ({children, initialSummary, discountContext}) => {
  const [quoteResponse, setResponse] = useState({});
  const [quoteQty, setQuoteQty] = useState(0);
  const [quoteNote, setQuoteNote] = useState();
  const [quoteEmail, setQuoteEmail] = useState();
  // Numero de orden de compra del comprador (E8). Muchas empresas no pagan una
  // factura que no lo traiga, asi que viaja al draft order y no a la nota.
  const [quotePoNumber, setQuotePoNumber] = useState('');
  // Las lineas viven en localStorage, que no tiene el techo de 4 KB de las
  // cookies. El servidor no puede leerlas, asi que el primer render arranca
  // vacio y se llenan al hidratar. Para que la barra y el contador NO parpadeen
  // ni diverjan, el servidor pinta con el resumen (`initialSummary`), que si
  // viaja en una cookie chica. Ver app/lib/quote-storage.js.
  const [quoteItems, setQuoteItems] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setQuoteItems(loadQuoteItems());
    setIsHydrated(true);
  }, []);

  /**
   * Guarda, pero NUNCA antes de haber leído.
   *
   * Entre el primer render del cliente y el efecto que carga localStorage,
   * `quoteItems` está vacío. Cualquier componente que sincronice cantidades en
   * un efecto de montaje llamaba a un mutador con esa lista vacía y **pisaba el
   * presupuesto real con `[]`** — el pedido se perdía al recargar, que es
   * exactamente el bug que este cambio venía a resolver.
   *
   * El guard va acá y no en cada mutador para que no haya forma de olvidarlo.
   */
  const persist = (items) => {
    if (!isHydrated) return;
    // El importe se calcula acá y se guarda junto con el conteo: es lo que le
    // permite al servidor pintar la barra completa, sin precio faltante.
    saveQuoteItems(items, getQuoteTotal(items, discountContext));
  };

  const {t} = useTranslation();

  // Antes de hidratar manda el resumen del servidor; despues, los datos reales.
  const summaryQty = initialSummary?.count ?? 0;

  useEffect(() => {
    setQuoteQty(quoteItems.reduce((acc, item) => acc + item.quantity, 0));
  }, [quoteItems]);

  const addQuoteItem = (item) => {
    // Agregar dos veces la misma variante sumaba una línea nueva en vez de
    // acumular: el presupuesto terminaba con el mismo SKU repetido y un total
    // correcto pero imposible de revisar.
    const existing = quoteItems.find((quoteItem) => quoteItem.id === item.id);

    const newQuoteItems = existing
      ? quoteItems.map((quoteItem) =>
          quoteItem.id === item.id
            ? {
                ...quoteItem,
                quantity:
                  Number(quoteItem.quantity || 0) + Number(item.quantity || 1),
              }
            : quoteItem,
        )
      : [...quoteItems, toQuoteLine(item, Number(item.quantity) || 1)];

    setQuoteItems(newQuoteItems);
    persist(newQuoteItems);
  };

  /**
   * Suma varias lineas de una (repetir pedido / cargar lista guardada).
   *
   * No es un `forEach(addQuoteItem)`: `addQuoteItem` lee `quoteItems` del
   * closure, asi que N llamadas seguidas dentro del mismo render parten todas
   * del mismo estado y solo sobrevive la ultima. Ademas persistiria la cookie
   * N veces.
   *
   * Las lineas ya vienen normalizadas por `toQuoteLine` desde /api/variants:
   * son datos frescos del catalogo, no la foto vieja de la lista guardada.
   */
  const addQuoteItems = (lines = []) => {
    if (!lines.length) return;

    const merged = [...quoteItems];

    lines.forEach((line) => {
      const index = merged.findIndex((item) => item.id === line.id);
      if (index === -1) {
        merged.push(line);
        return;
      }
      merged[index] = {
        ...merged[index],
        quantity:
          Number(merged[index].quantity || 0) + Number(line.quantity || 1),
      };
    });

    setQuoteItems(merged);
    persist(merged);
  };

  const updateQuoteItem = (item, qty) => {
    const updatedItems = quoteItems.map((quoteItem) => {
      if (quoteItem.id === item.id) {
        return {...quoteItem, quantity: qty};
      }
      return quoteItem;
    });
    setQuoteItems(updatedItems);
    persist(updatedItems);
  };

  /**
   * Descuento 3 (el del presupuesto) sobre una linea.
   *
   * Vive en la linea y no en un estado aparte porque tiene que sobrevivir a la
   * recarga junto con el resto del pedido: un vendedor que negocia por
   * telefono no puede perder los descuentos por apretar F5.
   */
  const setLineDiscount = (itemId, slotId, percent) => {
    const value = clampDiscount(percent);
    const updated = quoteItems.map((item) =>
      item.id === itemId
        ? {...item, discounts: {...(item.discounts ?? {}), [slotId]: value}}
        : item,
    );
    setQuoteItems(updated);
    persist(updated);
  };

  const clearQuoteItems = () => {
    setQuoteItems([]);
    // Mismo guard que `persist`: vaciar antes de haber leído borraría un
    // presupuesto que todavía no cargamos.
    if (isHydrated) clearQuoteStorage();
  };

  const removeQuoteItem = (itemId) => {
    const newQuoteItems = quoteItems.filter((item) => item.id !== itemId);
    setQuoteItems(newQuoteItems);
    persist(newQuoteItems);
  };

  const submitQuote = async () => {
    const lineItems = quoteItems.map((item) => ({
      variantId: item.id,
      quantity: item.quantity,
      // Descuentos cargados en el presupuesto. Shopify acepta UN solo
      // appliedDiscount por linea, asi que el servidor los combina en el
      // efectivo; se mandan crudos para que la combinacion la haga el.
      discounts: item.discounts ?? {},
    }));

    const email = quoteEmail;
    if (!email || !lineItems.length) {
      setResponse({
        message: t('quoting.error-msg'),
        type: 'error',
      });
      return;
    }

    const note = quoteNote;

    // Make a POST request to the draft order create endpoint
    const response = await fetch('/api/draft-order/create', {
      method: 'POST',
      action: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {lineItems, email, note, poNumber: quotePoNumber},
      }),
    });

    if (response.ok) {
      // If the request was successful, clear the quoteItems from local storage
      const responseData = await response.json();
      setResponse({
        message: t('quoting.success-msg'),
        email,
        type: 'success',
      });
      clearQuoteItems();
      return responseData;
    }
    // El detalle técnico va a consola; al comprador se le dice qué hacer.
    const detail = await response.text();
    // eslint-disable-next-line no-console
    console.error('draft-order/create falló:', response.status, detail);

    setResponse({
      message:
        response.status === 401
          ? t('quoting.error-auth')
          : t('quoting.error-msg'),
      type: 'error',
    });

    return {success: false};
  };

  return (
    <QuoteContext.Provider
      value={{
        quoteItems,
        // Antes de hidratar, conteo y total salen del resumen que leyo el
        // servidor. Si arrancaran vacios, la barra parpadearia en cada carga.
        quoteTotal: isHydrated
          ? getQuoteTotal(quoteItems, discountContext)
          : initialSummary?.amount
          ? {
              amount: initialSummary.amount,
              currencyCode: initialSummary.currencyCode,
            }
          : null,
        // Antes de hidratar, el contador sale del resumen del servidor: si
        // arrancara en 0 la barra parpadearia en cada carga.
        quoteQty: isHydrated ? quoteQty : summaryQty,
        quoteResponse,
        setResponse,
        addQuoteItem,
        addQuoteItems,
        removeQuoteItem,
        updateQuoteItem,
        setLineDiscount,
        clearQuoteItems,
        submitQuote,
        setQuoteNote,
        setQuoteEmail,
        quotePoNumber,
        setQuotePoNumber,
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
};

export const useQuote = () => {
  return useContext(QuoteContext);
};
