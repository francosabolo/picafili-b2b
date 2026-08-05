import styles from './styles.module.scss';
import {useState, useEffect, Children} from 'react';
import {getProductPlaceholder} from '~/lib/placeholders';
import {IconPreview, IconDownloadFile} from '~/components/Icon/Icon';
import {CopyText} from '~/components/CopyText/CopyText.jsx';
import {ProductPrice} from '~/components/ProductPrice/ProductPrice.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import AvailabilityStatus from '~/components/AvailabilityStatus/AvailabilityStatus.jsx';
import {Link} from '@remix-run/react';

export function MobileQSProductModal({
  product,
  children,
  keysToRender,
  metafieldsObject,
}) {
  const {t} = useTranslation();

  const [isOpen, setIsOpen] = useState(false);

  const cardProduct = product?.variants ? product : getProductPlaceholder();
  if (!cardProduct?.variants?.nodes?.length) return null;

  const firstVariant = product?.variants?.nodes[0];
  if (!firstVariant) return null;

  const {image, price, compareAtPrice, availableForSale, currentlyNotInStock} =
    firstVariant;

  function toggleModal() {
    setIsOpen(!isOpen);
  }

  function ProductCard() {
    return (
      <>
        <CardImage
          image={image}
          availableForSale={availableForSale}
          currentlyNotInStock={currentlyNotInStock}
        />
        <div className={styles.productInformation}>
          <Sku firstVariant={firstVariant} />
          <Description product={product} />
          {children}
          <div className={styles.productPrice}>
            <strong>{t('product.price')}</strong>
            <ProductPrice product={product} />
          </div>
          <ProductDownloads
            product={product}
            keysToRender={keysToRender}
            metafieldsObject={metafieldsObject}
          ></ProductDownloads>
        </div>
      </>
    );
  }

  return (
    <div className={styles.MobileQSProductModalWrapper}>
      <div className={styles.openCardButton} onClick={toggleModal}>
        <IconPreview />
      </div>
      {isOpen && (
        <div className={styles.modalContent}>
          <div className={styles.overlay} onClick={toggleModal}></div>
          <div className={styles.cardContainer}>
            <ProductCard></ProductCard>
          </div>
        </div>
      )}
    </div>
  );
}

function CardImage({image, availableForSale, currentlyNotInStock}) {
  return (
    <div
      className={styles.cardImage}
      style={{
        backgroundImage: `url(${image?.url})`,
      }}
    >
      <AvailabilityStatus
        availableForSale={availableForSale}
        currentlyNotInStock={currentlyNotInStock}
      />
    </div>
  );
}

function Description({product}) {
  const {t} = useTranslation();
  const prodDescription =
    product?.description ||
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
  return (
    <div className={styles.descriptionWrapper}>
      <strong>
        {t('product.configurator.description')}
        <CopyText textToCopy={prodDescription} />
      </strong>
      <p className={styles.productDescription}>{prodDescription}</p>
    </div>
  );
}

function Sku({firstVariant}) {
  const {t} = useTranslation();

  return (
    <div className={styles.skuWrapper}>
      {firstVariant?.sku && (
        <>
          <strong>
            {t('product.configurator.code')}
            <CopyText textToCopy={firstVariant?.sku} />
          </strong>
          <span>{firstVariant?.sku}</span>
        </>
      )}
    </div>
  );
}

function ProductDownloads({product, keysToRender, metafieldsObject}) {
  const {t} = useTranslation();

  return (
    <div className={styles.productDownloadsWrapper}>
      <strong>{t('product.configurator.downloads')}</strong>
      <div className={styles.productDownloadsContainer}>
        {keysToRender?.map(
          (object) =>
            metafieldsObject[object.metafieldKey] && (
              <Link
                key={`${product?.id}-${object.metafieldKey}`}
                to={metafieldsObject[object.metafieldKey]}
                target="_blank"
              >
                <IconDownloadFile>
                  <span>{object.label}</span>
                </IconDownloadFile>
              </Link>
            ),
        )}
      </div>
    </div>
  );
}
