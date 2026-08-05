import {defer} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {getPaginationVariables} from '@shopify/hydrogen';
import {PRODUCT_ITEM_FRAGMENT} from '~/data/fragments';
import {
  SearchForm,
  SearchResults,
  NoSearchResults,
} from '~/components/Search/Search.jsx';
import {PageWidthContainer} from '~/components/PageWidthContainer/PageWidthContainer.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {allProductMetafields} from '~/data/metafields.js';
import {PARENT_PRODUCT_FILTER} from '~/lib/const.js';
import {pageTitle} from '~/lib/utils.js';

/**
 * Arma la query de búsqueda de Shopify.
 *
 * El fork le pegaba ` tag:parent` a todo término, para mostrar solo los
 * productos padre de su modelo padre/hijo. En una tienda que no usa ese modelo
 * eso no acota la búsqueda: **la vacía**. Verificado contra Picafili, donde 0
 * de 44 productos tienen ese tag y la búsqueda devolvía cero resultados para
 * cualquier palabra. Ahora el tag solo entra si la tienda lo declara
 * (`PARENT_PRODUCT_FILTER.searchTag`).
 *
 * @param {string} searchTerm
 */
function buildSearchQuery(searchTerm) {
  const prefixed = `${searchTerm}*`;
  const tag = PARENT_PRODUCT_FILTER?.searchTag;
  return tag ? `${prefixed} tag:${tag}` : prefixed;
}

/**
 * @type {MetaFunction}
 */
export const meta = ({matches}) => {
  return [{title: pageTitle(matches, 'page-title.search')}];
};

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, context}) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const variables = getPaginationVariables(request, {pageBy: 8});
  const searchTerm = String(searchParams.get('q') || ' ');

  if (!searchTerm) {
    return {
      searchResults: {results: null, totalResults: 0},
      searchTerm,
    };
  }

  const {errors, ...data} = await context.storefront.query(SEARCH_QUERY, {
    variables: {
      query: buildSearchQuery(searchTerm),
      metafieldIdentifiers: allProductMetafields,
      ...variables,
    },
  });

  if (!data) {
    throw new Error('No search data returned from Shopify API');
  }

  const totalResults = Object.values(data).reduce((total, value) => {
    return total + value.nodes.length;
  }, 0);

  const searchResults = {
    results: data,
    totalResults,
  };

  return defer({
    searchTerm,
    searchResults,
  });
}

export default function SearchPage() {
  /** @type {LoaderReturnData} */
  const {searchTerm, searchResults} = useLoaderData();
  const {t} = useTranslation();

  return (
    <div className="search">
      <PageWidthContainer>
        {/* Decir QUE se busco: "Buscar" a secas no orienta a nadie que llego
            desde el buscador del header. */}
        <h1 className="search-title">
          {searchTerm
            ? t('general.search-for', {term: searchTerm})
            : t('general.search')}
        </h1>
        <SearchForm searchTerm={searchTerm} />
        {!searchTerm || !searchResults.totalResults ? (
          <NoSearchResults />
        ) : (
          <SearchResults
            results={searchResults.results}
            searchTerm={searchTerm}
            showOnlyProducts={true}
          />
        )}
      </PageWidthContainer>
    </div>
  );
}

const SEARCH_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}

  fragment SearchPage on Page {
     __typename
     handle
    id
    title
    trackingParameters
  }
  fragment SearchArticle on Article {
    __typename
    handle
    id
    title
    trackingParameters
  }
  query search(
    $metafieldIdentifiers: [HasMetafieldsIdentifier!]!
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $query: String!
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    products: search(
      query: $query,
      unavailableProducts: HIDE,
      types: [PRODUCT],
      first: $first,
      sortKey: RELEVANCE,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
          ...ProductItem
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
    pages: search(
      query: $query,
      types: [PAGE],
      first: 10
    ) {
      nodes {
        ...on Page {
          ...SearchPage
        }
      }
    }
    articles: search(
      query: $query,
      types: [ARTICLE],
      first: 10
    ) {
      nodes {
        ...on Article {
          ...SearchArticle
        }
      }
    }
  }
`;

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
