import {Image} from '@shopify/hydrogen';
import {useTranslation} from '~/i18n/index.jsx';
import styles from './styles.module.scss';
import {ProductPrice} from '../ProductPrice/ProductPrice';
import {Link, useLocation} from '@remix-run/react';
import {QuoteItemActions} from '~/components/QuoteQuickSearchItemActions/QuoteQuickSearchItemActions.jsx';
import {PlaceHolderImg} from '../Skeleton/Skeleton';
import AvailabilityStatus from '~/components/AvailabilityStatus/AvailabilityStatus.jsx';
import {getProductSpecs} from '~/lib/product-specs.js';

/**
 * Tarjeta de producto del catálogo mayorista.
 *
 * Diseño mobile-first y sin hover: el CTA vivía sobre la imagen con
 * `opacity: 0` hasta pasar el mouse, así que en touch —donde no hay hover— la
 * única forma de agregar era entrar a la ficha. Ahora todo lo accionable está
 * siempre visible y en el flujo.
 *
 * Orden de lectura pensado para comprar por cantidad: foto → nombre →
 * código y stock → precio → cantidad y alta.
 *
 * @param {{product: object, loading?: 'eager' | 'lazy', className?: string}}
 */
export function ProductItem({product, loading, className}) {
  const variant = product?.variants?.nodes?.[0];
  const {t} = useTranslation();
  // Dos y no todas: la tarjeta ya carga titulo, SKU, stock, precio y stepper.
  // Para comparar de verdad esta la vista de tabla; aca alcanza con lo que
  // distingue un producto de su vecino de al lado.
  const specs = getProductSpecs(product, t).slice(0, 2);
  const currentLocation = useLocation();
  const productUrl = getProductUrl(product?.handle, currentLocation.pathname);

  return (
    <article className={`${styles.card} ${className ?? ''}`}>
      <Link
        to={productUrl}
        state={currentLocation}
        className={styles.media}
        tabIndex={-1}
        aria-hidden="true"
      >
        {product?.featuredImage ? (
          <Image
            alt={product.featuredImage.altText || product.title}
            aspectRatio="1/1"
            data={product.featuredImage}
            loading={loading}
            sizes="(min-width: 45em) 220px, 45vw"
          />
        ) : (
          <PlaceHolderImg />
        )}
      </Link>

      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link to={productUrl} state={currentLocation}>
            {product?.title}
          </Link>
        </h3>

        <div className={styles.meta}>
          {variant?.sku && <span className={styles.sku}>{variant.sku}</span>}
          <AvailabilityStatus
            availableForSale={variant?.availableForSale}
            currentlyNotInStock={variant?.currentlyNotInStock}
            quantityAvailable={variant?.quantityAvailable}
          />
        </div>

        {specs.length > 0 && (
          <dl className={styles.specs}>
            {specs.map((spec) => (
              <div className={styles.spec} key={spec.id}>
                <dt className={styles.specLabel}>{spec.label}</dt>
                <dd className={styles.specValue}>{spec.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className={styles.price}>
          <ProductPrice product={product} />
        </div>

        {variant && (
          <div className={styles.actions}>
            {/* El boton de carrito lo renderiza QuoteItemActions, no esta
                tarjeta. Antes lo ponian LOS DOS: la tarjeta mostraba dos
                iconos de carrito identicos, uno al lado del otro, y el
                segundo agregaba siempre 1 unidad ignorando el stepper. */}
            <QuoteItemActions
              quoteItem={variant}
              quantity={1}
              key={variant.id}
              viewport="desktop"
              stacked
            />
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Arma la URL del producto respetando el prefijo de locale.
 * Recibe el `pathname` en vez de llamar a useLocation(): así deja de ser un
 * hook disfrazado de helper y puede usarse dentro de un map.
 */
export function getProductUrl(handle, pathnameArg) {
  const pathname = pathnameArg ?? '';
  const match = /(\/[a-zA-Z]{2}\/)/g.exec(pathname);
  const isLocalePathname = match && match.length > 0;

  return isLocalePathname
    ? `${match[0]}products/${handle}`
    : `/products/${handle}`;
}
