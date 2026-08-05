import {useEffect, useState} from 'react';
import {ProductItem} from '~/components/ProductItem/ProductItem.jsx';
import styles from './styles.module.scss';
import {useLocation} from '@remix-run/react';
import {IconCaret} from '../Icon/Icon';

export function ProductsSlider({productsList, itemsPerPage = 4, heading}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const location = useLocation();
  const numberOfPages = Math.round(productsList?.length / itemsPerPage);

  //Reset status on URL change
  useEffect(() => {
    setCurrentIndex(0);
  }, [location]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < productsList?.length - itemsPerPage) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (productsList?.length == 0) return;

  return (
    <div className={styles.slider}>
      <h1 className={styles.title}>{heading}</h1>
      {numberOfPages > 1 && (
        <div class={styles.sliderButtonsContainer}>
          <button
            className={styles.sliderButton}
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <IconCaret direction={'right'} />
          </button>
          <button
            className={styles.sliderButton}
            onClick={handleNext}
            disabled={currentIndex + 1 >= numberOfPages}
          >
            <IconCaret direction={'left'} />
          </button>
        </div>
      )}
      <div className={styles.sliderContent}>
        <div
          className={styles.sliderWrapper}
          style={{
            '--slider-position': `-${
              (100 / productsList?.length) * itemsPerPage * currentIndex
            }%`,
            '--slider-width': `${(productsList?.length * 100) / itemsPerPage}%`,
            '--slide-width': `${100 / itemsPerPage}%`,
          }}
        >
          {productsList?.map((product) => (
            <ProductItem
              product={product}
              key={product.id}
              className={`snap-start w-80 ${styles.sliderItem}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
