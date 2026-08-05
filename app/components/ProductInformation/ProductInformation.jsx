import {Accordion} from '~/components/Accordion/Accordion';
import {PriceBreaks} from '~/components/PriceBreaks/PriceBreaks.jsx';
import styles from './styles.module.scss';
import {DownloadButton} from '~/components/DownloadButton/DownloadButton';
import {SkeletonText} from '~/components/Skeleton/Skeleton.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {ProductTab} from '~/components/ProductTab/ProductTab.jsx';
import {
  CEIcon,
  ClassIcon,
  IndoorIcon,
  TiraLed5Icon,
  TiraLed20Icon,
  InclinationAngleIcon,
  MagneticIcon,
  ProtectionIndexIcon,
  CutIcon,
} from '../ProductIcon/ProductIcon';

/**
 * @param {{
 *   product: ProductFragment;
 *   variants: Promise<ProductVariantsQuery>;
 * }}
 */
export function ProductInformation({product, isLoading, productSku}) {
  const {title, descriptionHtml, productType} = product;
  const {t} = useTranslation();

  const metafieldsObject = product.metafields
    .filter((metafield) => metafield !== null)
    .reduce((obj, metafield) => {
      if (metafield.key === 'finishings_meta') {
        obj[metafield.key] = metafield?.references?.nodes.map((node) => {
          const fieldsObject = node?.fields?.reduce((fieldsObj, field) => {
            if (field.key === 'image' && field.reference) {
              fieldsObj[field.key] = field.reference.image.url;
            } else {
              fieldsObj[field.key] = field.value;
            }
            return fieldsObj;
          }, {});
          return {
            handle: node.handle,
            id: node.id,
            ...fieldsObject,
          };
        });
      } else {
        try {
          obj[metafield.key] = JSON.parse(metafield.value);
        } catch (error) {
          obj[metafield.key] = metafield.value;
        }
      }
      return obj;
    }, {});

  const fixture = {
    title: t('metafields.lumens'),
    attributes: metafieldsObject?.lumens,
    key: 'fixture',
  };

  const led = {
    title: t('metafields.led'),
    attributes: metafieldsObject?.led,
    key: 'led',
  };

  const electrical = {
    title: t('metafields.electrical'),
    attributes: metafieldsObject?.electrical,
    key: 'electrical',
  };

  const protection = {
    title: t('metafields.protection_index'),
    attributes: metafieldsObject?.protection_index,
    key: 'protection',
  };

  const accessories = {
    title: t('metafields.accesories'),
    attributes: metafieldsObject?.accesories,
    key: 'accesories',
  };

  const dimming = {
    title: t('metafields.dimming'),
    attributes: metafieldsObject?.dimming,
    key: 'dimming',
  };

  const photometry = {
    title: t('metafields.photometric_curve'),
    value: metafieldsObject?.photometric_curve,
    key: 'photometry',
  };

  const datasheet = {
    title: t('metafields.data_sheet'),
    value: metafieldsObject?.data_sheet,
    key: 'data_sheet',
  };

  const finishings = {
    title: t('metafields.finishings'),
    attributes: metafieldsObject?.finishings_meta,
    key: 'finishings',
  };

  const attributes = [
    metafieldsObject?.watts,
    metafieldsObject?.kelvin,
    metafieldsObject?.cri,
    metafieldsObject?.beam_angle,
  ].filter(Boolean);

  const features = {
    title: t('product.features'),
    attributes,
  };

  // Atributo real del catálogo de Picafili. Se busca por namespace + key a
  // propósito: `metafieldsObject` indexa solo por key, y `shopify.material`
  // (referencia a metaobject, se serializa como un gid) pisaba a
  // `custom.material`, que es el texto legible.
  const materialValue = product.metafields?.find(
    (metafield) =>
      metafield?.namespace === 'custom' && metafield?.key === 'material',
  )?.value;

  const material = {
    title: 'Material',
    attributes: materialValue ? [materialValue] : undefined,
  };

  let buttonsToShow = [];

  if (datasheet.value) {
    buttonsToShow.push(datasheet);
  }

  if (photometry.value) {
    buttonsToShow.push(photometry);
  }

  let drawingValue = metafieldsObject['2d_drawing'];
  if (drawingValue) {
    drawingValue = drawingValue.replace(
      'https://www.dropbox.com',
      'https://dl.dropboxusercontent.com',
    );
  }

  const drawing = {
    title: 'Drawing',
    value: drawingValue,
    key: 'drawing',
  };

  return (
    <div className={styles.productInformation}>
      {isLoading && (
        <>
          <SkeletonText height={1} mb={2} />
          <SkeletonText height={4} mb={3} />
          <SkeletonText height={8} mb={4} />
          <SkeletonText height={2} mb={1} />
          <SkeletonText height={2} mb={1} />
          <SkeletonText height={2} mb={1} />
          <SkeletonText height={2} mb={1} />
          <SkeletonText height={2} mb={1} />
          <SkeletonText height={2} mb={1} />
        </>
      )}
      {!isLoading && (
        <>
          <div className={styles.productType}>{productType}</div>
          <h1 className={styles.productTitle}>{title}</h1>
          <h4 className={` `}>
            <strong>SKU:</strong> {productSku}
          </h4>
          <PriceBreaks variant={product?.selectedVariant} />
          <ProductTab
            heading={t('product.main-features')}
            isOpen={true}
            metafields={[material, features, dimming, finishings, drawing]}
            rowClassName="mainFeatures"
          />
          <ProductTab
            heading={t('product.details')}
            metafields={[fixture, led, electrical, protection, accessories]}
            rowClassName="details"
          >
            {/* Se pasa como children solo si hay algo que mostrar: si no,
                ProductTab creería que tiene contenido y dejaría el acordeón
                vacío en pantalla. */}
            {hasProductCertificates(metafieldsObject) ? (
              <ProductCertificates product={product} />
            ) : null}
          </ProductTab>
          <ProductDescription description={descriptionHtml} />
          <ProductDownloads downloads={buttonsToShow} />
        </>
      )}
    </div>
  );
}

function ProductDescription({description}) {
  const {t} = useTranslation();

  // Sin descripción no se muestra la sección. Antes caía en un Lorem ipsum
  // hardcodeado que terminaba publicado en la ficha real del cliente.
  if (!description) return null;

  return (
    <>
      <Accordion
        accordionTitle={t('product.description')}
        contentClassName={styles.descriptionAccordionContent}
      >
        <div dangerouslySetInnerHTML={{__html: description}} />
      </Accordion>
    </>
  );
}

/**
 * CE y clase eléctrica son afirmaciones regulatorias: se muestran solo si el
 * producto las tiene declaradas. Antes salían siempre, y en este catálogo
 * terminaban sobre mantas y mochilas de bebé.
 * @param {Record<string, any>} metafieldsObject
 */
function hasProductCertificates(metafieldsObject) {
  return Boolean(
    metafieldsObject?.ce ??
      metafieldsObject?.class ??
      metafieldsObject?.inclination_angle ??
      metafieldsObject?.protection_index,
  );
}

function ProductCertificates({product}) {
  const metafieldsObject = product?.metafields?.reduce((acc, metafield) => {
    if (metafield) {
      let value = metafield.value;
      if (metafield.type === 'list.single_line_text_field') {
        let valueArray = JSON.parse(metafield.value);
        value = valueArray[0];
      }
      acc[metafield.key] = value;
    }
    return acc;
  }, {});

  if (!hasProductCertificates(metafieldsObject)) return null;

  const hasCE = Boolean(metafieldsObject?.ce ?? metafieldsObject?.class);

  return (
    <div className={styles.productCertificates}>
      {hasCE && <CEIcon />}
      {metafieldsObject.class && (
        <ClassIcon classValue={metafieldsObject.class} />
      )}
      {metafieldsObject.inclination_angle && (
        <InclinationAngleIcon angleValue={metafieldsObject.inclination_angle} />
      )}
      {metafieldsObject.protection_index && (
        <ProtectionIndexIcon pIndexValue={metafieldsObject?.protection_index} />
      )}
      {product.productType === 'Recessed' && (
        <CutIcon
          cutType={metafieldsObject.cut_type}
          cutValue={metafieldsObject.cut_value}
        />
      )}
      {product.tags.includes('indoor') && <IndoorIcon />}
      {product.tags.includes('tira_led_5') && <TiraLed5Icon />}
      {product.tags.includes('tira_led_20') && <TiraLed20Icon />}
      {product.tags.includes('magnetic') && <MagneticIcon />}
    </div>
  );
}

function ProductDownloads({downloads}) {
  return (
    <div className={styles.productDownloadButtons}>
      {downloads.map((download, index) => (
        <DownloadButton
          key={index}
          className={styles.productDownloadButton}
          buttonText={download?.title}
          buttonURL={download?.value}
        />
      ))}
    </div>
  );
}
