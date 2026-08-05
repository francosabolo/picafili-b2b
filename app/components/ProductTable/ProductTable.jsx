import {Image} from '@shopify/hydrogen';
import {Link, useLocation} from '@remix-run/react';
import {useTranslation} from '~/i18n/index.jsx';
import {getProductUrl} from '~/components/ProductItem/ProductItem.jsx';
import {ProductPrice} from '~/components/ProductPrice/ProductPrice.jsx';
import {QuoteItemActions} from '~/components/QuoteQuickSearchItemActions/QuoteQuickSearchItemActions.jsx';
import AvailabilityStatus from '~/components/AvailabilityStatus/AvailabilityStatus.jsx';
import {getProductSpecs, getSpecColumns} from '~/lib/product-specs.js';
import {PlaceHolderImg} from '~/components/Skeleton/Skeleton.jsx';
import styles from './styles.module.scss';

/**
 * Vista de tabla del listado: comparar sin abrir cada ficha.
 *
 * **Por qué una tabla y no tarjetas más densas.** Comparar es leer el mismo dato
 * de varios productos, y eso solo funciona si el dato cae siempre en la misma
 * columna. Una grilla de tarjetas obliga a buscar "material" en un lugar
 * distinto en cada una: por muy compacta que sea, el ojo no puede recorrer una
 * fila. Es la misma lectura que ya tiene `/compra-rapida`, traída al catálogo
 * navegable.
 *
 * **Las columnas salen de los productos de ESTA página**, no de un listado fijo
 * (`getSpecColumns`). Una tienda sin metafields ve la tabla sin columnas de
 * spec y no se rompe nada; una con diez ve diez. Es lo que hace que esto siga
 * siendo plantilla.
 *
 * @param {{products: Array<object>}}
 */
export function ProductTable({products = []}) {
  const {t} = useTranslation();
  const location = useLocation();
  const specColumns = getSpecColumns(products, t);

  if (!products.length) return null;

  return (
    // El scroll horizontal vive acá y no en el body: con seis o siete columnas
    // la tabla no entra en un teléfono, y una página que se corre entera de
    // costado es peor que una tabla que se desplaza.
    <div className={styles.scroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.productCol}>
              {t('collections.table.product')}
            </th>
            <th scope="col">{t('product.configurator.code')}</th>
            {specColumns.map((column) => (
              <th scope="col" key={column.id}>
                {column.label}
              </th>
            ))}
            <th scope="col">{t('product.configurator.availability')}</th>
            <th scope="col" className={styles.priceCol}>
              {t('product.price')}
            </th>
            <th scope="col" className={styles.actionsCol}>
              <span className={styles.srOnly}>{t('quoting.add-to-quote')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              specColumns={specColumns}
              pathname={location.pathname}
              t={t}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * @param {{product: object, specColumns: Array<{id: string}>, pathname: string, t: Function}}
 */
function ProductRow({product, specColumns, pathname, t}) {
  const variant = product?.variants?.nodes?.[0];
  const productUrl = getProductUrl(product?.handle, pathname);

  // Por id y no por posición: un producto puede no tener la spec que sí tiene
  // su vecino, y recorrer las specs en orden dejaría el valor en la columna
  // equivocada — el error más caro posible en una tabla que existe para
  // comparar.
  const specsById = new Map(
    getProductSpecs(product, t).map((spec) => [spec.id, spec.value]),
  );

  return (
    <tr>
      <th scope="row" className={styles.productCell}>
        <Link to={productUrl} className={styles.productLink}>
          <span className={styles.thumb}>
            {product?.featuredImage ? (
              <Image
                alt={product.featuredImage.altText || product.title}
                aspectRatio="1/1"
                data={product.featuredImage}
                loading="lazy"
                sizes="56px"
              />
            ) : (
              <PlaceHolderImg />
            )}
          </span>
          <span className={styles.productTitle}>{product?.title}</span>
        </Link>
      </th>

      <td className={styles.sku}>{variant?.sku || '—'}</td>

      {specColumns.map((column) => (
        <td key={column.id}>{specsById.get(column.id) ?? '—'}</td>
      ))}

      <td>
        <AvailabilityStatus
          availableForSale={variant?.availableForSale}
          currentlyNotInStock={variant?.currentlyNotInStock}
          quantityAvailable={variant?.quantityAvailable}
        />
      </td>

      <td className={styles.priceCell}>
        <ProductPrice product={product} />
      </td>

      <td className={styles.actionsCell}>
        {variant && (
          <QuoteItemActions
            quoteItem={variant}
            quantity={1}
            key={variant.id}
            viewport="desktop"
            compact
          />
        )}
      </td>
    </tr>
  );
}
