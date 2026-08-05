import {Price} from '~/components/Price/Price.jsx';
import {Suspense} from 'react';
import {defer, redirect} from '@shopify/remix-oxygen';
import {Await, useLoaderData} from '@remix-run/react';
import {getSelectedProductOptions, Image} from '@shopify/hydrogen';
import {getVariantUrl} from '~/lib/variants';
import {QuickSearch} from '~/components/QuickSearch/QuickSearch.jsx';
import {
  GET_FILTERS_QUERY,
  SEARCH_QUERY,
} from '~/graphql/quicksearch/searchQuery.js';
import {PageWidthContainer} from '~/components/PageWidthContainer/PageWidthContainer';
import {
  PRODUCT_QUERY,
  VARIANTS_QUERY,
} from '~/graphql/products/productsQuery.js';
import {ProductForm} from '~/components/ProductForm/ProductForm.jsx';
import {pageTitle} from '~/lib/utils.js';
const FILTER_URL_PREFIX = 'filter.';
const QUERY_URL_PREFIX = 'query';

/**
 * @type {MetaFunction<typeof loader>}
 */
export const meta = ({data, location, matches}) => {
  return [{title: pageTitle(matches, data?.product?.title ?? '')}];
};

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({params, request, context}) {
  const {handle} = params;
  const {storefront} = context;

  const selectedOptions = getSelectedProductOptions(request).filter(
    (option) =>
      // Filter out Shopify predictive search query params
      !option.name.startsWith('_sid') &&
      !option.name.startsWith('_pos') &&
      !option.name.startsWith('_psq') &&
      !option.name.startsWith('_ss') &&
      !option.name.startsWith('_v') &&
      // Filter out third party tracking params
      !option.name.startsWith('fbclid'),
  );

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  // await the query for the critical product data
  const {shop, product} = await storefront.query(PRODUCT_QUERY, {
    variables: {
      handle,
      selectedOptions,
    },
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  const firstVariant = product.variants.nodes[0];
  const firstVariantIsDefault = Boolean(
    firstVariant.selectedOptions.find(
      (option) => option.name === 'Title' && option.value === 'Default Title',
    ),
  );

  if (firstVariantIsDefault) {
    product.selectedVariant = firstVariant;
  } else {
    // if no selected variant was returned from the selected options,
    // we redirect to the first variant's url with it's selected options applied
    if (!product.selectedVariant) {
      throw redirectToFirstVariant({product, request});
    }
  }

  // In order to show which variants are available in the UI, we need to query
  // all of them. But there might be a *lot*, so instead separate the variants
  // into it's own separate query that is deferred. So there's a brief moment
  // where variant options might show as available when they're not, but after
  // this deffered query resolves, the UI will update.
  const variants = storefront.query(VARIANTS_QUERY, {
    variables: {handle},
  });

  const searchParams = new URL(request.url).searchParams;
  const appliedFiltersList = [...searchParams?.entries()].reduce(
    (filters, [key, value]) => {
      if (key.startsWith(FILTER_URL_PREFIX)) {
        const filterKey = key.substring(FILTER_URL_PREFIX.length);
        filters?.push({
          [filterKey]: JSON.parse(value),
        });
      }
      return filters;
    },
    [],
  );

  const SkuQuery = [...searchParams?.entries()].reduce(
    (query, [key, value]) => {
      if (key.startsWith(QUERY_URL_PREFIX)) {
        query.push({
          query: value,
        });
      }
      return query;
    },
    [],
  );

  const filters = await context?.storefront?.query(GET_FILTERS_QUERY, {
    variables: {
      query: SkuQuery[0] ? SkuQuery[0].query : '',
    },
  });

  const filtersValues = filters?.search?.productFilters.flatMap(
    (filter) => filter.values,
  );

  const appliedFilters = appliedFiltersList
    .map((filter) => {
      const foundValue = filtersValues?.find((value) => {
        const valueInput = JSON.parse(value.input);
        // special case for price, the user can enter something freeform (still a number, though)
        // that may not make sense for the locale/currency.
        // Basically just check if the price filter is applied at all.
        if (valueInput.price && filter.price) {
          return true;
        }
        return (
          // This comparison should be okay as long as we're not manipulating the input we
          // get from the API before using it as a URL param.
          JSON.stringify(valueInput) === JSON.stringify(filter)
        );
      });
      if (!foundValue) {
        // eslint-disable-next-line no-console
        console.error('Could not find filter value for filter', filter);
        return null;
      }

      if (foundValue.id === 'filter.v.price') {
        // Special case for price, we want to show the min and max values as the label.
        const input = JSON.parse(foundValue.input);
        const min = parseAsCurrency(input.price?.min ?? 0, locale);
        const max = input.price?.max
          ? parseAsCurrency(input.price.max, locale)
          : '';
        const label = min && max ? `${min} - ${max}` : 'Price';

        return {
          filter,
          label,
        };
      }
      return {
        filter,
        label: foundValue.label,
      };
    })
    .filter((filter) => filter !== null);

  //Valor de los metacampos usados como filtros
  const productAttributesQuery = filters.search.productFilters
    .filter((e) => {
      // Aca reviso si el filtro es un metacampo
      return e.id.includes('p.m');
    })
    .map((e) => {
      let productMetafield = {
        namespace: e.id.replace('filter.p.m.', '').split('.')[0],
        key: e.id.replace('filter.p.m.', '').split('.')[1],
      };
      return productMetafield;
    });

  const productAttributes = filters.search.productFilters
    .filter((e) => {
      // Aca reviso si el filtro es un metacampo
      return e.id.includes('p.m');
    })
    .map((e) => {
      let productMetafield = {
        namespace: e.id.replace('filter.p.m.', '').split('.')[0],
        key: e.id.replace('filter.p.m.', '').split('.')[1],
        label: e.label,
      };
      return productMetafield;
    });

  const {search} = await context.storefront.query(SEARCH_QUERY, {
    variables: {
      query: SkuQuery[0] ? SkuQuery[0].query : '',
      first: 10,
      productFilter: appliedFiltersList,
      identifiers: await productAttributesQuery,
    },
  });

  return defer({
    product,
    variants,
    shop,
    filters,
    productAttributes,
    search,
    SkuQuery,
    appliedFilters,
  });
}

/**
 * @param {{
 *   product: ProductFragment;
 *   request: Request;
 * }}
 */
function redirectToFirstVariant({product, request}) {
  const url = new URL(request.url);
  const firstVariant = product.variants.nodes[0];

  return redirect(
    getVariantUrl({
      pathname: url.pathname,
      handle: product.handle,
      selectedOptions: firstVariant.selectedOptions,
      searchParams: new URLSearchParams(url.search),
    }),
    {
      status: 302,
    },
  );
}

export default function Product() {
  /** @type {LoaderReturnData} */
  const {
    product,
    shop,
    variants,
    search,
    filters,
    appliedFilters,
    productAttributes,
  } = useLoaderData();
  const {selectedVariant} = product;

  return (
    <>
      <div className="product">
        <ProductImage image={selectedVariant?.image} />
        <ProductMain
          selectedVariant={selectedVariant}
          product={product}
          variants={variants}
        />
      </div>
      <PageWidthContainer>
        <QuickSearch
          allFilters={filters?.search?.productFilters}
          appliedFilters={appliedFilters}
          searchResults={search}
          productAttributes={productAttributes}
        />
      </PageWidthContainer>
    </>
  );
}

/**
 * @param {{image: ProductVariantFragment['image']}}
 */
function ProductImage({image}) {
  if (!image) {
    return <div className="product-image" />;
  }
  return (
    <div className="product-image">
      <Image
        alt={image.altText || 'Product Image'}
        aspectRatio="1/1"
        data={image}
        key={image.id}
        sizes="(min-width: 45em) 50vw, 100vw"
      />
    </div>
  );
}

/**
 * @param {{
 *   product: ProductFragment;
 *   selectedVariant: ProductFragment['selectedVariant'];
 *   variants: Promise<ProductVariantsQuery>;
 * }}
 */
function ProductMain({selectedVariant, product, variants}) {
  const {title, descriptionHtml} = product;
  return (
    <div className="product-main">
      <h1>{title}</h1>
      <ProductPrice selectedVariant={selectedVariant} />
      <br />
      <Suspense
        fallback={
          <ProductForm
            product={product}
            selectedVariant={selectedVariant}
            variants={[]}
          />
        }
      >
        <Await
          errorElement="There was a problem loading product variants"
          resolve={variants}
        >
          {(data) => (
            <ProductForm
              product={product}
              selectedVariant={selectedVariant}
              variants={data.product?.variants.nodes || []}
            />
          )}
        </Await>
      </Suspense>
      <p>
        <strong>Description</strong>
      </p>
      <br />
      <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
      <br />
    </div>
  );
}

/**
 * @param {{
 *   selectedVariant: ProductFragment['selectedVariant'];
 * }}
 */
function ProductPrice({selectedVariant}) {
  return (
    <div className="product-price">
      {selectedVariant?.compareAtPrice ? (
        <>
          <p>Sale</p>
          <br />
          <div className="product-price-on-sale">
            {selectedVariant ? <Price data={selectedVariant.price} /> : null}
            <s>
              <Price data={selectedVariant.compareAtPrice} />
            </s>
          </div>
        </>
      ) : (
        selectedVariant?.price && <Price data={selectedVariant?.price} />
      )}
    </div>
  );
}
/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */
/** @typedef {import('@remix-run/react').FetcherWithComponents} FetcherWithComponents */
/** @typedef {import('storefrontapi.generated').ProductFragment} ProductFragment */
/** @typedef {import('storefrontapi.generated').ProductVariantsQuery} ProductVariantsQuery */
/** @typedef {import('storefrontapi.generated').ProductVariantFragment} ProductVariantFragment */
/** @typedef {import('@shopify/hydrogen').VariantOption} VariantOption */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').CartLineInput} CartLineInput */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').SelectedOption} SelectedOption */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
