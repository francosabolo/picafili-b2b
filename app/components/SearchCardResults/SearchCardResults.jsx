import {Grid} from '~/components/Grid/Grid.jsx';
import {getImageLoadingPriority} from '~/lib/const';
import styles from './styles.module.scss';
import {ProductCard} from '~/components/ProductCard/ProductCard.jsx';

export function SearchCardResults({searchResults, productAttributes}) {
  const productList = searchResults.edges;

  return (
    <div className={styles.SearchResultsProductGrid}>
      <Grid layout="products" data-test="product-grid" items="1">
        {productList.map((product, i) => {
          return (
            <ProductCard
              key={'productCard' + i}
              product={product.node}
              loading={getImageLoadingPriority(i)}
              quickAdd={true}
            />
          );
        })}
      </Grid>
    </div>
  );
}
