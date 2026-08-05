import {VariantSelector} from '@shopify/hydrogen';
import {useTranslation} from '~/i18n/index.jsx';
import {ProductSwatches} from '~/components/ProductSwatches/ProductSwatches.jsx';
import {AddToCartButton} from '~/components/AddToCartButton/AddToCartButton.jsx';

/**
 * @param {{
 *   product: ProductFragment;
 *   selectedVariant: ProductFragment['selectedVariant'];
 *   variants: Array<ProductVariantFragment>;
 * }}
 */
export function ProductForm({product, selectedVariant, variants}) {
  const {t} = useTranslation();

  return (
    <div className="product-form">
      <VariantSelector
        handle={product.handle}
        options={product.options}
        variants={variants}
      >
        {({option}) => <ProductSwatches key={option.name} option={option} />}
      </VariantSelector>
      <br />
      <AddToCartButton
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={() => {
          window.location.href = window.location.href + '#cart-aside';
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                },
              ]
            : []
        }
      >
        {selectedVariant?.availableForSale
          ? t('cart.add')
          : t('availability.out-of-stock')}
      </AddToCartButton>
    </div>
  );
}
