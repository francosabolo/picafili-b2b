import {defer} from '@shopify/remix-oxygen';
import {pageTitle} from '~/lib/utils.js';
import {useLoaderData, useNavigation} from '@remix-run/react';
import {getPaginationVariables} from '@shopify/hydrogen';
import {QuickSearch} from '~/components/QuickSearch/QuickSearch.jsx';
import {ProductGallery} from '~/components/ProductGallery/ProductGallery';
import {
  GET_FILTERS_QUERY,
  SEARCH_QUERY,
} from '~/graphql/quicksearch/searchQuery.js';
import {PageWidthContainer} from '~/components/PageWidthContainer/PageWidthContainer';
import {
  PRODUCT_QUERY,
  RECOMMENDED_PRODUCTS_QUERY,
} from '~/graphql/products/productsQuery.js';
import {ProductInformation} from '~/components/ProductInformation/ProductInformation';
import {useEffect, useState} from 'react';
import {ProductsSlider} from '~/components/ProductsSlider/ProductsSlider';
import {allProductMetafields} from '~/data/metafields.js';
import Breadcrumb from '~/components/Breadcrumb/Breadcrumb';
import {useTranslation} from '~/i18n/index.jsx';
// Estaba usado sin importar: la etiqueta del filtro de precio tiraba
// ReferenceError apenas alguien aplicaba ese filtro.
import {parseAsCurrency} from '~/lib/utils';

const FILTER_URL_PREFIX = 'filter.';
/**
 * @type {MetaFunction<typeof loader>}
 */
export const meta = ({data, matches}) => {
  return [{title: pageTitle(matches, data?.product?.title ?? '')}];
};

export const handle = 'product-page';

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({params, request, context}) {
  const {handle} = params;
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const searchParams = new URL(request.url).searchParams;

  // await the query for the critical product data
  const {product} = await storefront.query(PRODUCT_QUERY, {
    variables: {
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
      handle,
      selectedOptions: [],
      identifiers: allProductMetafields,
    },
  });

  // El 404 va ANTES de tocar el producto: si el handle no existe, `product` es
  // null y leer `.variants` tiraba un 500 en vez de la página de no encontrado.
  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  const firstVariant = product.variants.nodes[0];
  product.selectedVariant = firstVariant;

  const appliedFiltersList = [...(searchParams?.entries() ?? [])].reduce(
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

  const productSku = firstVariant?.sku;
  const searchQuery = productSku + '* AND NOT tag:parent';

  const filters = await context?.storefront?.query(GET_FILTERS_QUERY, {
    variables: {
      tag: 'child',
      query: searchQuery,
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
    },
  });

  const filtersValues = filters?.search?.productFilters.flatMap(
    (filter) => filter.values,
  );

  const appliedFilters = appliedFiltersList
    ?.map((filter) => {
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
        const locale = context.storefront.i18n;
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

      const getFilterID = () => {
        let a = foundValue.id.split('.');
        a.pop();
        return a.join('.');
      };

      return {
        filter,
        label: foundValue.label,
        id: getFilterID(),
      };
    })
    .filter((filter) => filter !== null);

  // Documentation is here https://shopify.dev/docs/api/usage/search-syntax
  // PowerB2X ©
  // AND NOT tag:parent will do the magic.
  const {search} = await context.storefront.query(SEARCH_QUERY, {
    variables: {
      ...paginationVariables,
      query: searchQuery,
      productFilter: appliedFiltersList,
      identifiers: allProductMetafields,
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
    },
  });
  const childProducts = search;

  // if parent product has any tech_docs metafields, we want to add them to the child products in case they don't have them
  product.metafields.forEach((productMetafield) => {
    if (productMetafield && productMetafield.namespace === 'tech_docs') {
      childProducts.edges.forEach((childProduct) => {
        const correspondingChildMetafield = childProduct.node.metafields.find(
          (childMetafield) =>
            childMetafield &&
            childMetafield.key === productMetafield.key &&
            childMetafield.namespace === productMetafield.namespace,
        );
        if (!correspondingChildMetafield) {
          childProduct.node.metafields.push({
            ...productMetafield,
            value: productMetafield.value,
          });
        }
      });
    }
  });

  const recommendedProducts = await storefront.query(
    RECOMMENDED_PRODUCTS_QUERY,
    {
      variables: {
        handle,
        metafieldIdentifiers: allProductMetafields,
      },
    },
  );

  return defer({
    product,
    filters,
    childProducts,
    productSku,
    appliedFilters,
    recommendedProducts,
  });
}

export default function Product() {
  /** @type {LoaderReturnData} */
  const {
    product,
    childProducts,
    filters,
    appliedFilters,
    productSku,
    recommendedProducts,
  } = useLoaderData();

  // El skeleton se muestra mientras Remix esta navegando, no por un
  // temporizador. Antes `isLoading` arrancaba en `true` y un setTimeout de
  // 300ms lo apagaba: el SERVIDOR renderizaba skeletons en vez de productos
  // —medido: 0 tarjetas y 55 referencias a skeleton en el HTML de
  // /collections/all— y el contenido real aparecia recien 300ms despues de
  // hidratar. Los datos ya vienen resueltos del loader: no habia nada que
  // esperar.
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';
  const {t} = useTranslation();

  const quickSearchFilter = filters?.search?.productFilters.filter(
    (filter) =>
      filter.id !== 'filter.p.tag' &&
      filter.id !== 'filter.p.m.product.grouped',
  );

  return (
    <>
      {/* El breadcrumb esta posicionado absoluto: fuera del grid, si no queda
          encima de la caja de la galeria. */}
      <Breadcrumb product={product} />
      <div className="product">
        <ProductGallery images={product?.images?.nodes} isLoading={isLoading} />
        <ProductInformation
          isLoading={isLoading}
          product={product}
          productSku={productSku}
        />
      </div>
      <PageWidthContainer>
        <QuickSearch
          allFilters={quickSearchFilter}
          appliedFilters={appliedFilters}
          searchResults={childProducts}
        />
        <ProductsSlider
          productsList={recommendedProducts.productRecommendations}
          itemsPerPage={4}
          heading={t('product.accessories')}
        />
      </PageWidthContainer>
    </>
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
