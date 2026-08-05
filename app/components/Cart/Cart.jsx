import {Price} from '~/components/Price/Price.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {CartForm, Image} from '@shopify/hydrogen';
import {Link} from '@remix-run/react';
import {useVariantUrl} from '~/lib/variants';
import {IconRemoveItem} from '~/components/Icon/Icon.jsx';
import styles from './styles.module.scss';
import {formatOptionName} from '~/lib/utils.js';

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
    <div className={styles.cart}>
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

  return (
    <>
      <CartLines lines={cart?.lines} layout={layout} />
      {cartHasItems && (
        <CartSummary cost={cart.cost} layout={layout}>
          <CartDiscounts discountCodes={cart.discountCodes} />
          <CartCheckoutActions checkoutUrl={cart.checkoutUrl} />
        </CartSummary>
      )}
    </>
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
export function CartSummary({cost, layout, children = null}) {
  const {t} = useTranslation();
  return (
    <div className={styles.summary}>
      <div className={styles.totalRow}>
        <span>{t('cart.subtotal')}</span>
        <span>
          {cost?.subtotalAmount?.amount ? (
            <Price data={cost.subtotalAmount} withoutTrailingZeros />
          ) : (
            '-'
          )}
        </span>
      </div>
      {children}
    </div>
  );
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
      <button
        type="submit"
        className={styles.remove}
        aria-label={t('cart.remove')}
        title={t('cart.remove')}
      >
        <IconRemoveItem viewBox="0 0 20 20" />
      </button>
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

  return (
    <div className={styles.quantity}>
      <div className={styles.stepper}>
        <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
          <button
            type="submit"
            aria-label={t('cart.decrease')}
            disabled={quantity <= 1}
            name="decrease-quantity"
            value={prevQuantity}
          >
            &#8722;
          </button>
        </CartLineUpdateButton>
        <span className={styles.quantityValue}>{quantity}</span>
        <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
          <button
            type="submit"
            aria-label={t('cart.increase')}
            name="increase-quantity"
            value={nextQuantity}
          >
            &#43;
          </button>
        </CartLineUpdateButton>
      </div>
      <CartLineRemoveButton lineIds={[lineId]} />
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

  return (
    <div>
      <Price withoutTrailingZeros {...passthroughProps} data={moneyV2} />
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
      {children}
    </CartForm>
  );
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
