import {Link} from '@remix-run/react';
import {Image} from '@shopify/hydrogen';
import {useTranslation} from '~/i18n/index.jsx';
import styles from './styles.module.scss';

/**
 * "Explorá por categoría" — las colecciones de la tienda como grilla.
 *
 * Vive en un componente y no dentro de la home porque se muestra en los dos
 * lugares donde alguien está eligiendo qué mirar: la home y el catálogo
 * completo. En `/collections/all` importa incluso más — ahí el comprador
 * aterriza con 16 productos sin agrupar y esto es lo único que le dice que hay
 * un orden.
 *
 * No se renderiza si la tienda no tiene colecciones: un bloque con título y
 * nada abajo es peor que no tenerlo.
 *
 * @param {{
 *   collections: Array<{id: string, handle: string, title: string, image?: object}>,
 *   showAllLink?: boolean,
 * }}
 */
export function CategoryGrid({collections = [], showAllLink = true}) {
  const {t} = useTranslation();

  if (!collections.length) return null;

  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <div>
          <h2 className={styles.title}>{t('home.categories-title')}</h2>
          <p className={styles.lead}>{t('home.categories-lead')}</p>
        </div>
        {showAllLink && (
          <Link to="/collections" className={styles.link}>
            {t('home.see-all')}
          </Link>
        )}
      </header>

      <div className={styles.categories}>
        {collections.map((collection) => (
          <Link
            key={collection.id}
            to={`/collections/${collection.handle}`}
            className={styles.category}
          >
            {collection.image?.url ? (
              <Image
                data={collection.image}
                aspectRatio="4/3"
                sizes="(min-width: 45em) 260px, 45vw"
                loading="lazy"
              />
            ) : (
              <span className={styles.categoryPlaceholder} />
            )}
            <span className={styles.categoryName}>{collection.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
