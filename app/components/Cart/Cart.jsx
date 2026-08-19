import {Price} from '~/components/Price/Price.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {CartForm, Image} from '@shopify/hydrogen';
import {Link} from '@remix-run/react';
import {useVariantUrl} from '~/lib/variants';
import {IconRemoveItem} from '~/components/Icon/Icon.jsx';
import styles from './styles.module.scss';
import {
  formatOptionName,
  getPurchaseCeiling,
  getSavingsPercent,
} from '~/lib/utils.js';
import {useCartQuantityLimit} from '~/hooks/useCartQuantityLimit.jsx';
import {MinimumOrderNotice} from '~/components/Quote/MinimumOrderNotice.jsx';

/**
 * @param {CartMainProps}
 */
export function CartMain({layout, cart}) {
  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
  // Render condicional y no el atributo `hidden`: `hidden` se aplica con
  // `display: none` desde la hoja del navegador, asi que cualquier `display`
  // propio lo pisa. Con el estilo nuevo, el mensaje de carrito vacio se veia
  // al mismo tiempo que las lineas.
  return (
    <div
      className={`${styles.cart} ${layout === 'page' ? styles.pageLayout : ''}`}
    >
      {linesCount ? (
        <CartDetails cart={cart} layout={layout} />
      ) : (
        <CartEmpty layout={layout} />
      )}
    </div>
  );
}

/**
 * @param {CartMainProps}
 */
function CartDetails({layout, cart}) {
  const cartHasItems = !!cart && cart.totalQuantity > 0;
  const isPage = layout === 'page';

  return (
    <>
      <CartLines lines={cart?.lines} layout={layout} />
      {cartHasItems && (
        <CartSummary cart={cart} layout={layout}>
          {/* El drawer es para revisar y seguir comprando: su salida es la
              pantalla de carrito, donde están los totales, el envío estimado y
              el código de descuento. Mandarlo derecho al checkout de Shopify lo
              saca del portal sin haber visto lo que va a pagar. */}
          {isPage ? (
            <>
              <CartDiscounts discountCodes={cart.discountCodes} />
              <CartCheckoutActions checkoutUrl={cart.checkoutUrl} />
            </>
          ) : (
            <CartViewLink />
          )}
        </CartSummary>
      )}
    </>
  );
}

function CartViewLink() {
  const {t} = useTranslation();

  /**
   * Cierra el drawer antes de navegar.
   *
   * Los drawers se abren con `:target` (`#cart-aside`), y `:target` **no se
   * recalcula con `pushState`**: el `<Link>` de Remix cambia la URL sin
   * navegación de fragmento, así que el drawer quedaba abierto encima de la
   * pantalla de carrito. Vaciar el hash sí es una navegación de fragmento y lo
   * apaga.
   */
  const closeAside = () => {
    if (typeof window !== 'undefined' && window.location.hash) {
      window.location.hash = '';
    }
  };

  return (
    <Link className={styles.checkout} to="/cart" onClick={closeAside}>
      {t('cart.view-cart')} →
    </Link>
  );
}

/**
 * @param {{
 *   layout: CartMainProps['layout'];
 *   lines: CartApiQueryFragment['lines'] | undefined;
 * }}
 */
function CartLines({lines, layout}) {
  const {t} = useTranslation();

  if (!lines) return null;

  return (
    <ul className={styles.lines} aria-label={t('cart.title')}>
      {lines.nodes.map((line) => (
        <CartLineItem key={line.id} line={line} layout={layout} />
      ))}
    </ul>
  );
}

/**
 * @param {{
 *   layout: CartMainProps['layout'];
 *   line: CartLine;
 * }}
 */
function CartLineItem({layout, line}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);

  return (
    <li key={id} className={styles.line}>
      {image && (
        <Image
          alt={title}
          aspectRatio="1/1"
          data={image}
          height={100}
          loading="lazy"
          width={100}
        />
      )}

      <div className={styles.lineBody}>
        <Link
          className={styles.lineTitle}
          prefetch="intent"
          to={lineItemUrl}
          onClick={() => {
            if (layout === 'aside') {
              // close the drawer
              window.location.href = lineItemUrl;
            }
          }}
        >
          {product.title}
        </Link>
        <CartLinePrice line={line} as="span" />
        <span className={styles.lineOptions}>
          {selectedOptions
            .filter((option) => option.value !== 'Default Title')
            .map(
              (option) => `${formatOptionName(option.name)}: ${option.value}`,
            )
            .join(' · ')}
        </span>
        <CartLineQuantity line={line} />
      </div>
    </li>
  );
}

/**
 * @param {{checkoutUrl: string}}
 */
function CartCheckoutActions({checkoutUrl}) {
  const {t} = useTranslation();
  if (!checkoutUrl) return null;

  return (
    <a className={styles.checkout} href={checkoutUrl} target="_self">
      {t('cart.checkout')}
    </a>
  );
}

/**
 * @param {{
 *   children?: React.ReactNode;
 *   cost: CartApiQueryFragment['cost'];
 *   layout: CartMainProps['layout'];
 * }}
 */
export function CartSummary({cart, cost, layout, children = null}) {
  const {t} = useTranslation();
  const totals = cart?.cost ?? cost;
  const isPage = layout === 'page';

  // Descuentos del carrito entero (códigos y automáticos). Los de línea ya
  // vienen restados del subtotal, así que sumarlos acá los contaría dos veces.
  const discount = (cart?.discountAllocations ?? []).reduce(
    (sum, allocation) =>
      sum + Number(allocation?.discountedAmount?.amount ?? 0),
    0,
  );

  // Envío estimado. Shopify solo lo calcula con dirección conocida — en B2B, la
  // de la company location— y con tarifas cargadas para ese mercado. Cuando no
  // se puede, se dice; un cero ahí sería una promesa.
  const deliveryGroup = cart?.deliveryGroups?.nodes?.[0];
  const shipping =
    deliveryGroup?.selectedDeliveryOption?.estimatedCost ??
    deliveryGroup?.deliveryOptions?.[0]?.estimatedCost ??
    null;

  return (
    <div className={styles.summary}>
      <div className={styles.totalRow}>
        <span>{t('cart.subtotal')}</span>
        <span>
          {totals?.subtotalAmount?.amount ? (
            <Price data={totals.subtotalAmount} withoutTrailingZeros />
          ) : (
            '-'
          )}
        </span>
      </div>

      {isPage && discount > 0 && (
        <div className={`${styles.totalRow} ${styles.discountRow}`}>
          <span>{t('cart.discounts')}</span>
          <span>
            −
            <Price
              data={{
                amount: String(discount),
                currencyCode: totals?.subtotalAmount?.currencyCode,
              }}
              withoutTrailingZeros
            />
          </span>
        </div>
      )}

      {isPage && (
        <div className={`${styles.totalRow} ${styles.muted}`}>
          <span>{t('cart.shipping')}</span>
          <span>
            {shipping ? (
              <Price data={shipping} withoutTrailingZeros />
            ) : (
              t('cart.calculated-at-checkout')
            )}
          </span>
        </div>
      )}

      {isPage && (
        <div className={`${styles.totalRow} ${styles.muted}`}>
          <span>{t('cart.tax')}</span>
          <span>
            {totals?.totalTaxAmount?.amount ? (
              <Price data={totals.totalTaxAmount} withoutTrailingZeros />
            ) : (
              t('cart.calculated-at-checkout')
            )}
          </span>
        </div>
      )}

      {isPage && totals?.totalAmount?.amount && (
        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <span>{t('cart.total')}</span>
          <span>
            <Price data={totals.totalAmount} withoutTrailingZeros />
          </span>
        </div>
      )}

      {/* El pedido mínimo vivía en la barra del presupuesto, que ya no existe:
          quedó sin decirse en ningún lado. Va acá, pegado al subtotal, que es
          contra lo que se compara. Avisa, no bloquea. */}
      <MinimumOrderNotice
        total={totals?.subtotalAmount ?? null}
        compact={!isPage}
      />
      {children}
    </div>
  );
}

/**
 * El precio público de la línea, en la misma magnitud que el precio mostrado:
 * por unidad cuando se muestra el unitario, y multiplicado por la cantidad
 * cuando se muestra el total.
 *
 * @param {object} line
 * @param {'regular'|'compareAt'} priceType
 */
function compareAtForQuantity(line, priceType) {
  const unit = line?.cost?.compareAtAmountPerQuantity;
  if (!unit?.amount) return null;

  if (priceType !== 'regular') return unit;

  const quantity = Number(line?.quantity ?? 1);

  return {
    amount: (Number(unit.amount) * (quantity || 1)).toFixed(2),
    currencyCode: unit.currencyCode,
  };
}

/**
 * @param {{lineIds: string[]}}
 */
function CartLineRemoveButton({lineIds}) {
  const {t} = useTranslation();
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      {(fetcher) => {
        const busy = fetcher.state !== 'idle';

        return (
          <button
            type="submit"
            className={styles.remove}
            aria-label={t('cart.remove')}
            title={t('cart.remove')}
            disabled={busy}
            aria-busy={busy || undefined}
          >
            {busy ? <Spinner /> : <IconRemoveItem viewBox="0 0 20 20" />}
          </button>
        );
      }}
    </CartForm>
  );
}

/**
 * @param {{line: CartLine}}
 */
function CartLineQuantity({line}) {
  const {t} = useTranslation();
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  // Tope de compra conocido: máximo por pedido del catálogo y —cuando el token
  // tenga el scope de inventario— stock disponible. Con el tope alcanzado el
  // "+" se apaga en vez de mandar una operación que Shopify va a recortar.
  const ceiling = getPurchaseCeiling(line.merchandise);
  const atCeiling = Boolean(ceiling && quantity >= ceiling);

  return (
    <div className={styles.quantity}>
      <div className={styles.stepper}>
        <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
          {(busy) => (
            <button
              type="submit"
              aria-label={t('cart.decrease')}
              disabled={busy || quantity <= 1}
              aria-busy={busy || undefined}
              name="decrease-quantity"
              value={prevQuantity}
            >
              {busy ? <Spinner /> : <>&#8722;</>}
            </button>
          )}
        </CartLineUpdateButton>
        <span className={styles.quantityValue}>{quantity}</span>
        <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
          {(busy) => (
            <button
              type="submit"
              aria-label={t('cart.increase')}
              disabled={busy || atCeiling}
              aria-busy={busy || undefined}
              title={atCeiling ? t('cart.max-quantity') : undefined}
              name="increase-quantity"
              value={nextQuantity}
            >
              {busy ? <Spinner /> : <>&#43;</>}
            </button>
          )}
        </CartLineUpdateButton>
      </div>
      <CartLineRemoveButton lineIds={[lineId]} />
      {atCeiling && (
        <span className={styles.ceilingNote}>
          {t('cart.max-quantity-detail', {quantity: ceiling})}
        </span>
      )}
    </div>
  );
}

/**
 * @param {{
 *   line: CartLine;
 *   priceType?: 'regular' | 'compareAt';
 *   [key: string]: any;
 * }}
 */
function CartLinePrice({line, priceType = 'regular', ...passthroughProps}) {
  if (!line?.cost?.amountPerQuantity || !line?.cost?.totalAmount) return null;

  const moneyV2 =
    priceType === 'regular'
      ? line.cost.totalAmount
      : line.cost.compareAtAmountPerQuantity;

  if (moneyV2 == null) {
    return null;
  }

  // El ahorro se calcula por UNIDAD: el porcentaje sale igual y evita mezclar
  // magnitudes.
  const savings = getSavingsPercent(
    line.cost.amountPerQuantity,
    line.cost.compareAtAmountPerQuantity,
  );

  // El tachado tiene que estar en la MISMA magnitud que el precio que muestra
  // la fila. Con 3 unidades se veía "ARS 42.750" tachando "ARS 19.000": el
  // total de la línea contra el precio público de UNA unidad, o sea un ahorro
  // que se leía al revés.
  const compareAtTotal = compareAtForQuantity(line, priceType);

  return (
    <div className={styles.linePriceRow}>
      <Price withoutTrailingZeros {...passthroughProps} data={moneyV2} />
      {/* Lo mismo que muestra la tarjeta: el precio de lista tachado y cuánto
          se ahorra. En el carrito faltaba, así que el mayorista perdía de
          vista su ventaja justo en la pantalla donde decide comprar. */}
      {savings && compareAtTotal && (
        <>
          <s className={styles.lineCompareAt}>
            <Price withoutTrailingZeros data={compareAtTotal} />
          </s>
          <span className={styles.lineSavings}>−{savings}%</span>
        </>
      )}
    </div>
  );
}

/**
 * @param {{layout?: CartMainProps['layout']}}
 */
export function CartEmpty({layout = 'aside'}) {
  const {t} = useTranslation();

  return (
    <div className={styles.empty}>
      <p>{t('cart.empty')}</p>
      <Link
        className={styles.emptyLink}
        to="/collections"
        onClick={() => {
          if (layout === 'aside') {
            window.location.href = '/collections';
          }
        }}
      >
        {t('cart.continue')}
      </Link>
    </div>
  );
}

/**
 * @param {{
 *   discountCodes: CartApiQueryFragment['discountCodes'];
 * }}
 */
function CartDiscounts({discountCodes}) {
  const {t} = useTranslation();
  const codes =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  return (
    <div>
      {/* Have existing discount, display it with a remove option */}
      {codes.length > 0 && (
        <UpdateDiscountForm>
          <div className={styles.appliedDiscount}>
            <span>{t('cart.discounts')}:</span>
            <code>{codes.join(', ')}</code>
            <button type="submit">{t('cart.remove')}</button>
          </div>
        </UpdateDiscountForm>
      )}

      <UpdateDiscountForm discountCodes={codes}>
        <div className={styles.discountRow}>
          <input
            type="text"
            name="discountCode"
            placeholder={t('cart.discount-placeholder')}
          />
          <button type="submit">{t('cart.apply')}</button>
        </div>
      </UpdateDiscountForm>
    </div>
  );
}

/**
 * @param {{
 *   discountCodes?: string[];
 *   children: React.ReactNode;
 * }}
 */
function UpdateDiscountForm({discountCodes, children}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {children}
    </CartForm>
  );
}

/**
 * @param {{
 *   children: React.ReactNode;
 *   lines: CartLineUpdateInput[];
 * }}
 */
function CartLineUpdateButton({children, lines}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {(fetcher) => (
        <>
          {/* Shopify recorta al stock disponible y responde sin errores: sin
              esto, tocar "+" contra el tope deja el mismo número y ninguna
              explicación. */}
          <QuantityLimitWatcher
            fetcher={fetcher}
            lineId={lines?.[0]?.id}
            requested={lines?.[0]?.quantity}
          />
          {typeof children === 'function'
            ? children(fetcher.state !== 'idle')
            : children}
        </>
      )}
    </CartForm>
  );
}

/** Solo escucha; no renderiza nada. */
function QuantityLimitWatcher({fetcher, lineId, requested}) {
  useCartQuantityLimit(fetcher, {lineId, requested});
  return null;
}

/**
 * Indicador de que el carrito está trabajando.
 *
 * Cambiar una cantidad o borrar una línea es una vuelta de red: sin esto el
 * botón se apretaba y no pasaba nada visible durante medio segundo, así que se
 * volvía a apretar — y cada click era otra unidad. Ocupa el lugar del glifo
 * para que el botón no cambie de tamaño y la fila no salte.
 */
function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

/** @typedef {CartApiQueryFragment['lines']['nodes'][0]} CartLine */
/**
 * @typedef {{
 *   cart: CartApiQueryFragment | null;
 *   layout: 'page' | 'aside';
 * }} CartMainProps
 */

/** @typedef {import('@shopify/hydrogen/storefront-api-types').CartLineUpdateInput} CartLineUpdateInput */
/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
