import styles from './styles.module.scss';
import {CollectionNavigationBar} from '../CollectionNavigationBar/CollectionNavigationBar';

/**
 * @param {{
 *   analytics?: unknown;
 *   children: React.ReactNode;
 *   disabled?: boolean;
 *   lines: CartLineInput[];
 *   onClick?: () => void;
 * }}
 */

export function CollectionHeading({collection, menu, bannerTitle}) {
  const collectionImages = collection?.metafields
    ?.map((element) => {
      return {
        [element?.key]: element?.reference?.image?.url,
      };
    })
    .reduce((acc, obj) => ({...acc, ...obj}), {});

  const style = {
    '--banner-mobile': `url(${collectionImages?.banner_mobile})`,
    '--banner-desktop': `url(${collectionImages?.banner_desktop})`,
  };

  return (
    <div
      className={styles.collectionHeading}
      style={collectionImages ? style : null}
    >
      {/* Sin banner propio de la colección, cae en el degradé de marca Picafili
          (definido en el SCSS), no en el fondo azul de PowerB2X. */}
      <div className={styles.bannerContent}>
        <h1 className={styles.collectionTitle}>
          {bannerTitle ? bannerTitle : collection?.title}
        </h1>
        <CollectionNavigationBar menu={menu} styles={styles} />
      </div>
    </div>
  );
}
