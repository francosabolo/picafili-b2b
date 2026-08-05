import {Image} from '@shopify/hydrogen';
import {getProductPlaceholder} from '~/lib/placeholders';
import styles from './styles.module.scss';
import {IconClose, IconDownload, IconDownloadFile} from '../Icon/Icon';
import {QuoteItemActions} from '~/components/QuoteQuickSearchItemActions/QuoteQuickSearchItemActions.jsx';
import {ProductPrice} from '~/components/ProductPrice/ProductPrice.jsx';
import AvailabilityStatus from '~/components/AvailabilityStatus/AvailabilityStatus.jsx';
import {useState} from 'react';
import {CopyText} from '~/components/CopyText/CopyText.jsx';
import {Link} from '@remix-run/react';
import {MobileQSProductModal} from '../MobileQSProductModal/MobileQSProductModal';
import {formatOptionName} from '~/lib/utils.js';

/**
 * @param {{
 *   product: ProductCardFragment;
 *   label?: string;
 *   className?: string;
 *   loading?: HTMLImageElement['loading'];
 *   onClick?: () => void;
 *   quickAdd?: boolean;
 * }}
 */
export function QuickSearchItem({product, loading}) {
  const cardProduct = product?.variants ? product : getProductPlaceholder();
  if (!cardProduct?.variants?.nodes?.length) return null;

  const firstVariant = product?.variants?.nodes[0];
  if (!firstVariant) return null;

  const {image, availableForSale, currentlyNotInStock} = firstVariant;
  const metafieldsObject = product.metafields.reduce((acc, metafield) => {
    if (metafield) {
      acc[metafield.key] = metafield.value;
    }
    return acc;
  }, {});

  const keysToRender = [
    {
      metafieldKey: 'assembly_manual',
      label: '3d',
    },
    {
      metafieldKey: 'diagram',
      label: '2d',
    },
    {
      metafieldKey: 'data_sheet',
      label: 'ies',
    },
    {
      metafieldKey: 'photometric_curve',
      label: '3d',
    },
    {
      metafieldKey: 'ldt',
      label: 'ldt',
    },
  ];

  return (
    <div
      className={`flex flex-row gap-2 ${styles.QuickSearchItemWrapper}`}
      key={product?.id}
    >
      <div className={styles.QuickSearchItem}>
        <div className={styles.cardWrapper}>
          <div className={styles.productImage}>
            {image && (
              <Image
                className="object-cover w-full fadeIn"
                width="64px"
                height="64px"
                data={image}
                alt={image.altText || `Picture of ${product.title}`}
                loading={loading}
              />
            )}
          </div>
          <div className={styles.productInformation}>
            <div className={styles.productAttributes}>
              <ItemSku firstVariant={firstVariant} />
              <ItemDescription product={product} />
              <ItemSumUp product={product} viewport={'desktop'} />
              <div className={styles.priceWrapper}>
                <ProductPrice product={product} />
              </div>
              {/* Color y talle: son lo que distingue una fila de otra cuando
                  el producto tiene varias variantes. Reemplaza a la columna de
                  descargas, vacía en este catálogo. */}
              <div className={styles.attributesWrapper}>
                {(firstVariant?.selectedOptions ?? [])
                  // Shopify inventa "Title: Default Title" en productos sin
                  // variantes reales: mostrarlo ensucia la tabla sin aportar.
                  .filter(
                    (option) =>
                      option?.value &&
                      option.value.toLowerCase() !== 'default title',
                  )
                  .map((option) => (
                    <span
                      key={option.name}
                      className={styles.variantOption}
                      title={formatOptionName(option.name)}
                    >
                      {option.value}
                    </span>
                  ))}
              </div>
              <div className={styles.mobileAddtoQuote}>
                <QuoteItemActions
                  quoteItem={firstVariant}
                  quantity={1}
                  key={firstVariant.id}
                  viewport={'mobile'}
                />
              </div>
              <div className={styles.mobileCardWrapper}>
                <MobileQSProductModal
                  product={product}
                  metafieldsObject={metafieldsObject}
                  keysToRender={keysToRender}
                >
                  <ItemSumUp product={product} viewport={'mobile'} />
                </MobileQSProductModal>
              </div>
              <div className={styles.stockBadgeWrapper}>
                <AvailabilityStatus
                  availableForSale={availableForSale}
                  currentlyNotInStock={currentlyNotInStock}
                />
              </div>
            </div>
          </div>
          <div className={styles.productActions}>
            {/* `compact` por lo mismo que en ProductTable: el CTA ancho de
                "pendiente de aprobacion" no entra en la celda y se salia por
                los dos lados. */}
            <QuoteItemActions
              quoteItem={firstVariant}
              quantity={1}
              key={firstVariant.id}
              viewport={'desktop'}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadModal({children}) {
  const [isOpen, setIsOpen] = useState(false);
  const [animation, setAnimation] = useState();

  function toggleModal() {
    if (isOpen) {
      setAnimation(styles.closeModal);
    } else {
      setAnimation(styles.openModal);
    }
    setIsOpen(!isOpen);
  }

  return (
    <div>
      <button
        type="button"
        className={styles.downloadsToggle}
        onClick={toggleModal}
        aria-label="Ver descargas"
      >
        <IconDownload
          viewBox="0 0 20 20"
          fill="none"
          stroke="none"
          width="20"
          height="20"
        />
      </button>
      <div
        className={styles.downloadsModalWrapper}
        style={{
          animationName: animation,
          visibility: isOpen ? 'visible' : 'hidden',
        }}
      >
        <div className={styles.modalContent}>{children}</div>
        <IconClose onClick={toggleModal} viewBox="0 0 20 20"></IconClose>
      </div>
    </div>
  );
}

function ItemSumUp({product, viewport}) {
  // TODO:: change this with the correct keys.
  const keysToShow = [
    'cri',
    'lumens',
    'beam_angle',
    'kelvin',
    'efficience',
    'finishings',
    'dimming',
    'power',
    'opening',
    'watts',
    'cut_value',
    'cut_type',
    'inclination_angle',
    'protection_index',
    'temperature',
  ];
  const metafieldsToShow = product?.metafields?.filter((meta) =>
    keysToShow.includes(meta?.key),
  );

  return (
    <div className={`${styles.attributesWrapper} ${styles[viewport]}`}>
      {metafieldsToShow?.map((e, i) => {
        const attributeValue = e?.value.replace(/[\[\]"]+/g, '');
        return (
          <span className={styles.attributeValue} key={`attr--` + i}>
            {attributeValue}
          </span>
        );
      })}
    </div>
  );
}

function ItemDescription({product}) {
  const prodDescription =
    product?.description ||
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

  return (
    <div className={styles.descriptionWrapper}>
      <>
        <div className={styles.productDescription}>{prodDescription}</div>
        <CopyText textToCopy={prodDescription} />
      </>
    </div>
  );
}

function ItemSku({firstVariant}) {
  return (
    <div className={styles.skuWrapper}>
      {firstVariant?.sku && (
        <>
          <span>{firstVariant.sku}</span>
          <CopyText textToCopy={firstVariant?.sku} />
        </>
      )}
    </div>
  );
}

/** @typedef {import('@shopify/hydrogen/storefront-api-types').MoneyV2} MoneyV2 */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Product} Product */
/** @typedef {import('storefrontapi.generated').ProductCardFragment} ProductCardFragment */
