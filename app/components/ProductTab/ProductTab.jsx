import {Accordion} from '~/components/Accordion/Accordion.jsx';
import styles from './styles.module.scss';
import {Image} from '@shopify/hydrogen';

export function ProductTab({
  heading,
  metafields = [],
  isOpen = false,
  children,
  rowClassName,
}) {
  const filledMetafields = metafields.filter(
    (metafield) => metafield?.attributes?.length > 0,
  );
  const drawingMetafield = metafields.find(
    (metafield) => metafield?.key === 'drawing',
  );

  // Sin atributos, sin plano y sin hijos el acordeón queda vacío: no se
  // renderiza. Pasaba en todo el catálogo de Picafili, porque los metafields
  // que espera este componente son del vertical de iluminación del fork.
  const hasContent =
    filledMetafields.length > 0 || Boolean(drawingMetafield?.value) || children;

  if (!hasContent) return null;

  return (
    <>
      <Accordion
        accordionTitle={heading}
        contentClassName={styles.accordionContent}
        isOpenOnRender={isOpen}
      >
        <div className={styles.accordionContainer}>
          <div
            className={`${styles.accordionColumns} ${
              rowClassName === 'details' ? styles.details : ''
            }`}
          >
            {metafields
              .filter(
                (metafield) =>
                  metafield?.attributes && metafield.attributes.length > 0,
              )
              .map((metafield, index) => {
                return (
                  <ColumnAttribute
                    key={index}
                    title={metafield?.title}
                    attributes={metafield?.attributes}
                    metafieldKey={metafield?.key}
                  />
                );
              })}
          </div>
          <div className={styles.drawing}>
            {drawingMetafield?.value && (
              <Image
                src={drawingMetafield.value}
                width={500}
                height={300}
                sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            )}
          </div>
          {children}
        </div>
      </Accordion>
    </>
  );
}

function ColumnAttribute({title, attributes, metafieldKey}) {
  return (
    <div className={styles.columnWrapper}>
      <h4 className={styles.columnTitle}>{title}</h4>
      <ul
        className={`${styles.listWrapper} ${
          metafieldKey === 'finishings' ? styles.Colors : ''
        }`}
      >
        {attributes?.map((attr, index) => {
          if (metafieldKey === 'finishings') {
            const image = attr?.image;
            const colorCode = attr?.color;
            return (
              <li
                className={styles.colorCircle}
                style={{
                  backgroundImage: image ? `url(${image})` : 'undefined',
                  backgroundColor: image ? undefined : colorCode,
                }}
                key={`finishings--${attr.handle}`}
              />
            );
          }
          return (
            <li key={title + index} className={`finishings--${attr}`}>
              {Array.isArray(attr) ? attr.join(' ~ ') : attr}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
