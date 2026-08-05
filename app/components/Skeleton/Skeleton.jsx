import styles from './styles.module.scss';
import {Image} from '@shopify/hydrogen';

export function SkeletonGridItems({qty = 10}) {
  const skeletons = [];
  for (let i = 0; i < qty; i++) {
    skeletons.push(
      <div key={i} className={styles.skeleton}>
        <SkeletonImage height={22} />
        <SkeletonText height={1} mb={1} />
        <SkeletonText height={1} mb={1} />
      </div>,
    );
  }
  return <div className="products-grid">{skeletons}</div>;
}

export function SkeletonImage({height = 20}) {
  return (
    <div
      className={styles.skeletonImage}
      style={{height: `${height}rem`}}
    ></div>
  );
}

export function SkeletonText({height = 2, mb = 0}) {
  return (
    <div
      className={styles.skeletonText}
      style={{height: `${height}rem`, marginBottom: `${mb}rem`}}
    ></div>
  );
}

export function PlaceHolderImg() {
  return (
    <div
      className={styles.skeletonImage}
      style={{height: '100%', width: '100%'}}
    ></div>
  );
}
