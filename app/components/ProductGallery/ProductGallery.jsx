import {Image} from '@shopify/hydrogen';
import styles from './styles.module.scss';
import {IconCaret} from '../Icon/Icon';
import {SkeletonImage} from '~/components/Skeleton/Skeleton.jsx';
import {useState} from 'react';

/**
 * Galería de producto para catálogo mayorista.
 *
 * El patrón de los portales B2B (Grainger, Amazon Business, el prototipo de
 * Noblex) es siempre el mismo: caja contenida con relación de aspecto fija,
 * miniaturas al costado y contador. El comprador viene a verificar que el
 * artículo es el del SKU, no a inspirarse — la foto editorial a sangre le
 * agrega scroll y le saca contexto.
 *
 * @param {{images?: Array<object>, isLoading?: boolean}}
 */
export function ProductGallery({images = [], isLoading}) {
  // Solo entran las imagenes que Hydrogen puede renderizar. Un nodo sin `url`
  // contaba para el total igual: se dibujaban las flechas y el contador
  // ("1 / 3") sobre una caja vacia. Ese es el sintoma de "galeria vacia con
  // flechas" que estaba reportado. Hoy la tienda devuelve url en todas, pero
  // esto es una plantilla y la proxima tienda puede tener media sin procesar.
  const usable = (images ?? []).filter((image) => image?.url);

  const [selectedId, setSelectedId] = useState(null);

  // El indice se DERIVA de la seleccion en vez de guardarse. Guardandolo habia
  // que resincronizarlo por efecto cada vez que cambiaba el producto, y el
  // efecto corre despues del render: el primer frame del producto nuevo usaba
  // el indice del anterior.
  const selectedIndex = Math.max(
    0,
    usable.findIndex((image) => image.id === selectedId),
  );

  if (isLoading) {
    return (
      <div className={styles.gallery}>
        {/* La caja mide 620px como máximo: con `40vw` una pantalla 2x bajaba una
          imagen de 1400px (418 KB) para mostrarla a 564. */}
        <div className={styles.stage}>
          <SkeletonImage height={50} />
        </div>
      </div>
    );
  }

  const total = usable.length;
  const selectedImage = usable[selectedIndex];
  const hasMultiple = total > 1;
  const goTo = (index) => setSelectedId(usable[(index + total) % total]?.id);

  if (!total) return null;

  return (
    <div className={styles.gallery}>
      {hasMultiple && (
        <div className={styles.thumbs} role="tablist" aria-label="Imágenes">
          {usable.map((image, index) => (
            <button
              type="button"
              key={image?.id ?? index}
              role="tab"
              aria-selected={index === selectedIndex}
              aria-label={`Ver imagen ${index + 1} de ${total}`}
              className={`${styles.thumb} ${
                index === selectedIndex ? styles.thumbActive : ''
              }`}
              onClick={() => setSelectedId(image.id)}
            >
              {/* Las miniaturas se dibujan a 56-88px: no necesitan mas de
                  200px ni siquiera en pantallas 2x. */}
              <Image
                alt={image?.altText || `Imagen ${index + 1}`}
                aspectRatio="1/1"
                data={image}
                sizes="88px"
                srcSetOptions={{
                  intervals: 2,
                  startingWidth: 100,
                  incrementSize: 100,
                  placeholderWidth: 100,
                }}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      <div className={styles.stage}>
        {/* El srcset se corta en 1200 a proposito. La caja mide 620px como
            maximo, asi que a DPR 2 pide 1240 y el navegador elegia 1400 —y en
            pantallas anchas llegaba a 1800. Medido contra el CDN de Shopify:
            1800 = 506 KB, 1400 = 417 KB, 1200 = 313 KB. Cortar en 1200 baja
            un 25% sin diferencia visible en una caja de 564px, y elimina el
            escalon de 1800 que era pura transferencia perdida.

            Shopify ya sirve WebP por negociacion de contenido, asi que el
            formato no era el problema: era el ancho. */}
        <Image
          alt={selectedImage?.altText || 'Imagen del producto'}
          data={selectedImage}
          key={selectedImage.id}
          sizes="(min-width: 960px) 620px, 100vw"
          srcSetOptions={{
            intervals: 5,
            startingWidth: 400,
            incrementSize: 200,
            placeholderWidth: 600,
          }}
          loading="eager"
        />

        {hasMultiple && (
          <>
            <button
              type="button"
              className={`${styles.arrow} ${styles.arrowPrev}`}
              onClick={() => goTo(selectedIndex - 1)}
              aria-label="Imagen anterior"
            >
              <IconCaret direction={'right'} />
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.arrowNext}`}
              onClick={() => goTo(selectedIndex + 1)}
              aria-label="Imagen siguiente"
            >
              <IconCaret direction={'left'} />
            </button>
            <span className={styles.counter}>
              {selectedIndex + 1} / {total}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
