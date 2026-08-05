import {Price} from '~/components/Price/Price.jsx';
import {getSavingsPercent, isDiscounted} from '~/lib/utils.js';
import React from 'react';
import styles from './styles.module.scss';
import {useTranslation} from '~/i18n/index.jsx';
import {Button} from '@headlessui/react';
import {useAccountState} from '~/context/AccountStateContext.jsx';

export function ProductPrice({product}) {
  const variant = product?.variants?.nodes[0] ?? null;
  const {t} = useTranslation();
  const {canSeePrices} = useAccountState();
  const savings = getSavingsPercent(variant?.price, variant?.compareAtPrice);

  if (!variant) return null;

  // Gating de precio: a quien no está aprobado no se le muestra el precio, se
  // le muestra por qué no lo ve. Es lo que comunica que hay una zona adentro.
  if (!canSeePrices) {
    return (
      <div className={styles.priceLocked}>
        <span aria-hidden="true">🔒</span>
        {t('price.locked')}
      </div>
    );
  }

  return (
    <div className={styles.priceContainer}>
      {product?.tags?.includes('parent') ? (
        <div className={styles.priceLabel}>{t('price.from')}</div>
      ) : (
        ''
      )}
      {/* La moneda sale del dato de Shopify. Antes había un '€' hardcodeado
          que se sumaba al ARS de la tienda y renderizaba "ARS 62.600 €". */}
      <Price
        className={styles.price}
        data={variant?.price}
        withoutTrailingZeros
      />
      {/* Solo si es un precio anterior MAS ALTO: hay productos en el catalogo
          con compareAtPrice por debajo del precio, y tacharlo simulaba un
          descuento que en realidad era un aumento. */}
      {isDiscounted(variant?.price, variant?.compareAtPrice) && (
        <Price
          data={variant?.compareAtPrice}
          className={styles.compareAtPrice}
          withoutTrailingZeros
        />
      )}
      {/* Cuanto se ahorra contra el precio de lista (E2). El numero sale del
          dato de Shopify, nunca hardcodeado. */}
      {savings !== null && (
        <span className={styles.savings}>
          {t('price.savings', {percent: savings})}
        </span>
      )}
    </div>
  );
}

export function SignInButton() {
  const {t} = useTranslation();
  return (
    // go to account/login
    <Button to="/account/login" className={styles.signInButton}>
      {t('general.sign-in')}
    </Button>
  );
}

export function NotActiveButton() {
  const {t} = useTranslation();
  return (
    // go to account/login
    <Button to="/account/orders" className={styles.signInButton}>
      {t('general.not-active-user')}
    </Button>
  );
}
