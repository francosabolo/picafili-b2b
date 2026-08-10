import {json} from '@shopify/remix-oxygen';
import {canSeePricesOnServer, gatePrices} from '~/lib/price-gating.server.js';
import {useLoaderData, useNavigation, useSearchParams} from '@remix-run/react';
import {getPaginationVariables, Pagination} from '@shopify/hydrogen';
import {CATALOG_FILTERED_QUERY} from '~/graphql/collections/collectionsQuery.js';
import {allProductMetafields} from '~/data/metafields.js';
import {parseProductFilters} from '~/lib/product-filters.js';
import {ProductItem} from '~/components/ProductItem/ProductItem.jsx';
import {ProductTable} from '~/components/ProductTable/ProductTable.jsx';
import {
  getListView,
  LIST_VIEWS,
} from '~/components/ListViewToggle/ListViewToggle.jsx';
import {
  SkeletonGridItems,
  SkeletonImage,
} from '~/components/Skeleton/Skeleton.jsx';
import {CollectionToolbar} from '~/components/CollectionToolbar/CollectionToolbar.jsx';
import {COLLECTION_MENU_QUERY} from '~/graphql/header/menuQueries';
import {CollectionHeading} from '~/components/CollectionHeading/CollectionHeading.jsx';
import {PageWidthContainer} from '~/components/PageWidthContainer/PageWidthContainer';
import {useTranslation} from '~/i18n/index.jsx';
import {seoMeta} from '~/lib/seo.js';
import {getBuyerVariables} from '~/lib/b2b.server.js';

/**
 * @type {MetaFunction<typeof loader>}
 */
export const meta = ({matches, location}) => {
  return seoMeta({matches, location, title: 'page-title.products'});
};

export const handle = 'collection';

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, context}) {
  const {storefront, session} = context;
  // Los precios se filtran ACA, no en el componente: ver price-gating.server.js
  const canSeePrices = canSeePricesOnServer(request, context.b2b);
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  const searchParams = new URL(request.url).searchParams;
  const productFilters = parseProductFilters(searchParams);

  const collectionsMenu = await storefront.query(COLLECTION_MENU_QUERY, {
    variables: {
      collectionsMenuHandle: 'collections-menu',
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
  });

  const {search} = await storefront.query(CATALOG_FILTERED_QUERY, {
    variables: {
      ...getBuyerVariables(context),
      ...paginationVariables,
      metafieldIdentifiers: allProductMetafields,
      productFilters: productFilters.length ? productFilters : undefined,
    },
  });

  // El de precio necesita un rango, no un select: la barra no lo sabe manejar.
  const filters = (search?.productFilters ?? []).filter(
    (filter) => filter.id !== 'filter.v.price',
  );

  const allFilterValues = filters.flatMap((filter) => filter.values ?? []);

  const appliedFilters = productFilters
    .map((filter) => {
      const found = allFilterValues.find(
        (value) =>
          JSON.stringify(JSON.parse(value.input)) === JSON.stringify(filter),
      );
      return found ? {label: found.label, filter} : null;
    })
    .filter(Boolean);

  const user = session.get('user');
  return json({
    products: gatePrices(search, canSeePrices),
    filters,
    appliedFilters,
    user,
    collectionsMenu,
  });
}

export default function Collection() {
  /** @type {LoaderReturnData} */
  const {products, filters, appliedFilters, user, collectionsMenu} =
    useLoaderData();
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

  return (
    <div className="collection">
      {isLoading && products?.nodes ? (
        <>
          <SkeletonImage height={30} />
          <PageWidthContainer>
            <SkeletonGridItems qty={12} />
          </PageWidthContainer>
        </>
      ) : (
        <>
          <CollectionHeading
            menu={collectionsMenu}
            bannerTitle={t('collections.all.title')}
          />
          <PageWidthContainer>
            <Pagination connection={products}>
              {({
                nodes,
                isLoading,
                PreviousLink,
                NextLink,
                hasPreviousPage,
                hasNextPage,
              }) => (
                <>
                  {/* Solo si existe: se renderizaban siempre y reservaban el
                      alto de un boton arriba y abajo de la grilla aunque no
                      hubiera otra pagina. */}
                  {hasPreviousPage && (
                    <PreviousLink className="loadLessButton">
                      <span>
                        {isLoading
                          ? t('general.loading')
                          : `↑ ${t('general.load-previous')}`}
                      </span>
                    </PreviousLink>
                  )}
                  <CollectionToolbar
                    filters={filters}
                    appliedFilters={appliedFilters}
                    count={nodes.length}
                    heading={t('collections.filters.heading')}
                    label={t('collections.filters.label')}
                  />
                  {view === LIST_VIEWS.TABLE ? (
                    <ProductTable products={nodes} />
                  ) : (
                    <ProductsGrid products={nodes} user={user} />
                  )}
                  {hasNextPage && (
                    <NextLink className="loadMoreButton">
                      <span>
                        {isLoading
                          ? t('general.loading')
                          : `${t('general.load-more')} ↓`}
                      </span>
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
function ProductsGrid({products, user}) {
  return (
    <div className="products-grid">
      {products.map((product, index) => {
        return (
          <ProductItem
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : undefined}
            user={user}
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
