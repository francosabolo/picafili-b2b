import {json, redirect} from '@shopify/remix-oxygen';
import {canSeePricesOnServer, gatePrices} from '~/lib/price-gating.server.js';
import {seoMeta} from '~/lib/seo.js';
import {useLoaderData, useNavigation, useSearchParams} from '@remix-run/react';
import {getPaginationVariables, Pagination} from '@shopify/hydrogen';
import {CollectionToolbar} from '~/components/CollectionToolbar/CollectionToolbar.jsx';
import {CollapsibleText} from '~/components/CollapsibleText/CollapsibleText.jsx';
import {COLLECTION_QUERY} from '~/graphql/collections/collectionsQuery.js';
import {allProductMetafields} from '~/data/metafields.js';
import {parseProductFilters} from '~/lib/product-filters.js';
import {PARENT_PRODUCT_FILTER} from '~/lib/const.js';
import {CollectionHeading} from '~/components/CollectionHeading/CollectionHeading.jsx';
import {PageWidthContainer} from '~/components/PageWidthContainer/PageWidthContainer';
import {ProductItem} from '~/components/ProductItem/ProductItem';
import {ProductTable} from '~/components/ProductTable/ProductTable.jsx';
import {
  getListView,
  LIST_VIEWS,
} from '~/components/ListViewToggle/ListViewToggle.jsx';
import {COLLECTION_MENU_QUERY} from '~/graphql/header/menuQueries';
import {
  SkeletonGridItems,
  SkeletonImage,
} from '~/components/Skeleton/Skeleton.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {ConsultTooltip} from '~/components/ConsultButton/ConsultButton';
import {getBuyerVariables} from '~/lib/b2b.server.js';

/**
 * @type {MetaFunction<typeof loader>}
 */
export const meta = ({data, matches, location}) => {
  const collection = data?.collection;

  return seoMeta({
    matches,
    location,
    // `seo` es lo que el comercio escribió en el admin de Shopify para esta
    // colección: si lo cargó, manda sobre el título y la descripción del
    // catálogo. Es la diferencia entre respetar su trabajo y pisarlo.
    title: collection?.title ?? '',
    rawTitle: collection?.seo?.title || null,
    description:
      collection?.seo?.description || collection?.description || null,
    image: collection?.image?.url ?? null,
  });
};

export const handle = 'collection';

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, params, context}) {
  const {handle} = params;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  if (!handle) {
    return redirect('/collections/all-products');
  }

  const searchParams = new URL(request.url).searchParams;
  const filters = parseProductFilters(searchParams);
  const {sortKey, reverse} = getSortValuesFromParam(searchParams.get('sort'));

  // Modelo padre/hijo del fork: apagado salvo que la tienda lo use.
  // Ver PARENT_PRODUCT_FILTER en app/lib/const.js.
  if (PARENT_PRODUCT_FILTER?.metafield) {
    filters.push({productMetafield: PARENT_PRODUCT_FILTER.metafield});
  }

  const {collection} = await context.storefront.query(COLLECTION_QUERY, {
    variables: {
      ...getBuyerVariables(context),
      ...paginationVariables,
      handle,
      metafieldIdentifiers: allProductMetafields,
      filters,
      sortKey,
      reverse,
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
    },
  });

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    });
  }

  const allFilterValues = collection.products.filters.flatMap(
    (filter) => filter.values,
  );

  const appliedFilters = filters
    .map((filter) => {
      const foundValue = allFilterValues?.find((value) => {
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
    .filter(
      (filter) =>
        filter !== null && filter.filter.productMetafield.key !== 'grouped',
    );

  const collectionsMenu = await context.storefront.query(
    COLLECTION_MENU_QUERY,
    {
      variables: {
        collectionsMenuHandle: 'collections-menu',
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    },
  );

  return json({
    collection: gatePrices(
      collection,
      canSeePricesOnServer(request, context.b2b),
    ),
    appliedFilters,
    collectionsMenu,
  });
}

export default function Collection() {
  /** @type {LoaderReturnData} */
  const {collection, appliedFilters, collectionsMenu} = useLoaderData();
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
  const [searchParams] = useSearchParams();
  const view = getListView(searchParams);

  const collectionFilters = collection?.products?.filters.filter(
    (filter) =>
      filter.id !== 'filter.p.tag' &&
      filter.id !== 'filter.p.m.product.grouped',
  );

  return (
    <div className="collection">
      {isLoading && collection?.nodes?.products?.length ? (
        <>
          <SkeletonImage height={30} />
          <PageWidthContainer>
            <SkeletonGridItems qty={12} />
          </PageWidthContainer>
        </>
      ) : (
        <>
          <CollectionHeading collection={collection} menu={collectionsMenu} />
          <PageWidthContainer>
            {/* La descripcion es texto para buscadores; el mayorista entra a
                pedir. Se pliega para que la grilla no arranque a dos
                pantallas de scroll — ver CollapsibleText. */}
            {collection.description && (
              <CollapsibleText className="collection-description">
                {collection.description}
              </CollapsibleText>
            )}
            <Pagination connection={collection.products}>
              {({
                nodes,
                isLoading,
                PreviousLink,
                NextLink,
                hasPreviousPage,
                hasNextPage,
              }) => (
                <>
                  {/* Solo si existe. Antes se renderizaban siempre y
                      reservaban el alto de un boton arriba y abajo de la
                      grilla aunque no hubiera otra pagina. */}
                  {hasPreviousPage && (
                    <PreviousLink className="loadMoreButton">
                      {isLoading ? 'Loading...' : <span>Cargar más</span>}
                    </PreviousLink>
                  )}
                  <CollectionToolbar
                    filters={collectionFilters}
                    appliedFilters={appliedFilters}
                    count={nodes.length}
                    heading={t('collections.filters.heading')}
                    label={t('collections.filters.label')}
                  />
                  {view === LIST_VIEWS.TABLE ? (
                    <ProductTable products={nodes} />
                  ) : (
                    <ProductsGrid products={nodes} />
                  )}
                  <ConsultTooltip />
                  <br />
                  {hasNextPage && (
                    <NextLink className="loadMoreButton">
                      {isLoading ? 'Loading...' : <span>Cargar más</span>}
                    </NextLink>
                  )}
                </>
              )}
            </Pagination>
          </PageWidthContainer>
        </>
      )}
    </div>
  );
}

/**
 * @param {{products: ProductItemFragment[]}}
 */
function ProductsGrid({products}) {
  return (
    <div className="products-grid">
      {products.map((product, index) => {
        return (
          <ProductItem
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : undefined}
          />
        );
      })}
    </div>
  );
}

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */

/** @typedef {import('storefrontapi.generated').ProductItemFragment} ProductItemFragment */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
function getSortValuesFromParam(sortParam) {
  switch (sortParam) {
    case 'price-high-low':
      return {
        sortKey: 'PRICE',
        reverse: true,
      };
    case 'price-low-high':
      return {
        sortKey: 'PRICE',
        reverse: false,
      };
    case 'best-selling':
      return {
        sortKey: 'BEST_SELLING',
        reverse: false,
      };
    case 'newest':
      return {
        sortKey: 'CREATED',
        reverse: true,
      };
    case 'featured':
      return {
        sortKey: 'MANUAL',
        reverse: false,
      };
    default:
      return {
        sortKey: 'RELEVANCE',
        reverse: false,
      };
  }
}
