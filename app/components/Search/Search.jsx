import {Price} from '~/components/Price/Price.jsx';
import {
  Link,
  Form,
  useParams,
  useFetcher,
  useNavigate,
  useSearchParams,
} from '@remix-run/react';
import {Image, Pagination} from '@shopify/hydrogen';
import React, {useRef, useEffect, useState} from 'react';
import {applyTrackingParams} from '~/lib/search.js';
import {ProductItem} from '../ProductItem/ProductItem.jsx';
import styles from './styles.module.scss';
import {ProductTable} from '~/components/ProductTable/ProductTable.jsx';
import {
  getListView,
  LIST_VIEWS,
  ListViewToggle,
} from '~/components/ListViewToggle/ListViewToggle.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {useUser} from '~/context/UserContext.jsx';
import {Button} from '@headlessui/react';

export const NO_PREDICTIVE_SEARCH_RESULTS = [
  {type: 'queries', items: []},
  {type: 'products', items: []},
  {type: 'collections', items: []},
  {type: 'pages', items: []},
  {type: 'articles', items: []},
];

/**
 * @param {{searchTerm: string}}
 */
export function SearchForm({searchTerm}) {
  const {t} = useTranslation();
  const inputRef = useRef(null);

  // focus the input when cmd+k is pressed
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'k' && event.metaKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === 'Escape') {
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  return (
    <Form method="get" className={styles.searchForm}>
      <input
        defaultValue={searchTerm}
        name="q"
        placeholder={t('general.search')}
        ref={inputRef}
        type="search"
        className={styles.searchFormInput}
        autoFocus
      />
      &nbsp;
      <button type="submit" className={styles.searchFormButton}>
        {t('general.search')}
      </button>
    </Form>
  );
}

/**
 * @param {Pick<FetchSearchResultsReturn['searchResults'], 'results'> & {
 *   searchTerm: string;
 * }}
 */
export function SearchResults({results, searchTerm, showOnlyProducts = false}) {
  if (!results) {
    return null;
  }
  const keys = Object.keys(results);
  return (
    <div>
      {results &&
        keys.map((type) => {
          const resourceResults = results[type];

          if (
            resourceResults.nodes[0]?.__typename === 'Page' &&
            !showOnlyProducts
          ) {
            const pageResults = resourceResults;
            return resourceResults.nodes.length ? (
              <SearchResultPageGrid key="pages" pages={pageResults} />
            ) : null;
          }

          if (resourceResults.nodes[0]?.__typename === 'Product') {
            const productResults = resourceResults;
            return resourceResults.nodes.length ? (
              <SearchResultsProductsGrid
                key="products"
                products={productResults}
                searchTerm={searchTerm}
                showOnlyProducts={showOnlyProducts}
              />
            ) : null;
          }

          if (
            resourceResults.nodes[0]?.__typename === 'Article' &&
            !showOnlyProducts
          ) {
            const articleResults = resourceResults;
            return resourceResults.nodes.length ? (
              <SearchResultArticleGrid
                key="articles"
                articles={articleResults}
              />
            ) : null;
          }

          return null;
        })}
    </div>
  );
}

/**
 * @param {Pick<SearchQuery, 'products'> & {searchTerm: string}}
 */
function SearchResultsProductsGrid({products, searchTerm, showOnlyProducts}) {
  const [searchParams] = useSearchParams();
  const {t} = useTranslation();
  const view = getListView(searchParams);

  return (
    <div className="search-result">
      {!showOnlyProducts && <h2>{t('collections.products')}</h2>}
      <Pagination connection={products}>
        {({nodes, isLoading, NextLink, PreviousLink}) => {
          const ItemsMarkup = nodes.map((product, index) => (
            <ProductItem
              product={product}
              loading={index < 8 ? 'eager' : undefined}
              key={product.id}
            />
          ));

          return (
            <div>
              <div>
                <PreviousLink className="loadMoreButton">
                  {isLoading ? 'Loading...' : <span>Cargar más</span>}
                </PreviousLink>
              </div>

              {/* La busqueda no tenia ni conteo ni vista de tabla, y es por
                  donde entra el mayorista que ya sabe que quiere. Comparar
                  resultados en tabla es exactamente ese caso de uso. */}
              <div className={styles.resultsBar}>
                <span className={styles.resultsCount}>
                  {t('collections.count', {count: nodes.length})}
                </span>
                <ListViewToggle />
              </div>

              {view === LIST_VIEWS.TABLE ? (
                <ProductTable products={nodes} />
              ) : (
                <div className="products-grid">
                  {ItemsMarkup}
                  <br />
                </div>
              )}
              <div>
                <NextLink className="loadMoreButton">
                  {isLoading ? 'Loading...' : <span>Cargar más</span>}
                </NextLink>
              </div>
            </div>
          );
        }}
      </Pagination>
      <br />
    </div>
  );
}

/**
 * @param {Pick<SearchQuery, 'pages'>}
 */
function SearchResultPageGrid({pages}) {
  return (
    <div className="search-result">
      <h2>Pages</h2>
      <div>
        {pages?.nodes?.map((page) => (
          <div className="search-results-item" key={page.id}>
            <Link prefetch="intent" to={`/pages/${page.handle}`}>
              {page.title}
            </Link>
          </div>
        ))}
      </div>
      <br />
    </div>
  );
}

/**
 * @param {Pick<SearchQuery, 'articles'>}
 */
function SearchResultArticleGrid({articles}) {
  return (
    <div className="search-result">
      <h2>Articles</h2>
      <div>
        {articles?.nodes?.map((article) => (
          <div className="search-results-item" key={article.id}>
            <Link prefetch="intent" to={`/blogs/${article.handle}`}>
              {article.title}
            </Link>
          </div>
        ))}
      </div>
      <br />
    </div>
  );
}

export function NoSearchResults() {
  const {t} = useTranslation();

  return <h3>{t('general.no_result_search')}</h3>;
}

/**
 *  Search form component that sends search requests to the `/search` route
 * @param {SearchFromProps}
 */
export function PredictiveSearchForm({
  action,
  children,
  className = 'predictive-search-form',
  ...props
}) {
  const navigate = useNavigate();
  const params = useParams();
  const fetcher = useFetcher({
    key: 'search',
  });
  const inputRef = useRef(null);

  function fetchResults(event) {
    const searchAction = action ?? '/api/predictive-search';
    const newSearchTerm = event?.target?.value
      ? event.target.value + '* tag:parent'
      : '';
    const localizedAction = params.locale
      ? `/${params.locale}${searchAction}`
      : searchAction;

    fetcher.submit(
      {q: newSearchTerm, limit: '6'},
      {method: 'GET', action: localizedAction},
    );
  }

  // ensure the passed input has a type of search, because SearchResults
  // will select the element based on the input
  useEffect(() => {
    inputRef?.current?.setAttribute('type', 'search');
  }, []);

  function searchTerm() {
    const term = inputRef.current.value;
    inputRef.current.value = '';
    fetchResults();
    window.location.href = params.locale
      ? `/${params.locale}/search?q=${term}`
      : `/search?q=${term}`;
  }

  return (
    <fetcher.Form
      {...props}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!inputRef?.current || inputRef.current.value === '') {
          return;
        }
        inputRef.current.blur();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return;
        searchTerm();
      }}
    >
      {children({fetchResults, inputRef, fetcher})}
    </fetcher.Form>
  );
}

export function PredictiveSearchResults({
  className = styles.predictiveSearchResults,
}) {
  const {results, totalResults, searchInputRef, searchTerm, state} =
    usePredictiveSearch();
  const params = useParams();

  const query = searchTerm?.current?.replace('* tag:parent', '');

  function goToSearchResult(event) {
    if (!searchInputRef.current) return;
    searchInputRef.current.blur();
    searchInputRef.current.value = '';
    // close the aside
    window.location.href = event.currentTarget.href;
  }

  const {t} = useTranslation();

  // if (state === 'loading') {
  //   return <div>Loading...</div>;
  // }

  if (!totalResults) {
    return (
      <NoPredictiveSearchResults
        searchTerm={searchTerm}
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      <div>
        {results.map(({type, items}) => (
          <PredictiveSearchResult
            goToSearchResult={goToSearchResult}
            items={items}
            key={type}
            searchTerm={searchTerm}
            type={type}
          />
        ))}
      </div>
      {searchTerm.current && (
        <Link
          onClick={goToSearchResult}
          to={
            params.locale
              ? `/${params.locale}/search?q=${query}`
              : `/search?q=${query}`
          }
        >
          <p>
            {t('general.search-results-for')} <q>{query}</q>
            &nbsp; →
          </p>
        </Link>
      )}
    </div>
  );
}

/**
 * @param {{
 *   searchTerm: React.MutableRefObject<string>;
 * }}
 */
function NoPredictiveSearchResults({searchTerm, className}) {
  if (!searchTerm.current) {
    return null;
  }
  return (
    <p className={className}>
      No results found for{' '}
      <q>{searchTerm.current.replace('* tag:parent', '')}</q>
    </p>
  );
}

/**
 * @param {SearchResultTypeProps}
 */
function PredictiveSearchResult({goToSearchResult, items, searchTerm, type}) {
  const isSuggestions = type === 'queries';
  const categoryUrl = `/search?q=${
    searchTerm.current
  }&type=${pluralToSingularSearchType(type)}`;
  const {t} = useTranslation();

  return (
    <div className={styles.predictiveSearchResult} key={type}>
      <Link prefetch="intent" to={categoryUrl} onClick={goToSearchResult}>
        <h5>{t('general.products')}</h5>
      </Link>
      <ul>
        {items.map((item) => (
          <SearchResultItem
            goToSearchResult={goToSearchResult}
            item={item}
            key={item.id}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * @param {SearchResultItemProps}
 */
function SearchResultItem({goToSearchResult, item}) {
  const {t} = useTranslation();
  const [userData, setUserData] = useState({});
  const {getUserData} = useUser();

  useEffect(() => {
    const userData = getUserData();
    setUserData(userData);
  }, [getUserData]);

  return (
    <li className={styles.predictiveSearchResultItem} key={item.id}>
      <Link onClick={goToSearchResult} to={item.url}>
        {item.image?.url && (
          <Image
            alt={item.image.altText ?? ''}
            src={item.image.url}
            width={50}
            height={50}
          />
        )}
        <div className={styles.productInfo}>
          {item.styledTitle ? (
            <div
              dangerouslySetInnerHTML={{
                __html: item.styledTitle,
              }}
            />
          ) : (
            <span className={styles.itemTitle}>{item.title}</span>
          )}
          {!userData?.id ? (
            <Button to="/account/login">{t('general.sign-in')}</Button>
          ) : (
            <Price data={item.price} />
          )}
        </div>
      </Link>
    </li>
  );
}

/**
 * @return {UseSearchReturn}
 */
function usePredictiveSearch() {
  const searchFetcher = useFetcher({key: 'search'});
  const searchTerm = useRef('');
  const searchInputRef = useRef(null);

  if (searchFetcher?.state === 'loading') {
    searchTerm.current = searchFetcher.formData?.get('q') || '';
  }

  const search = searchFetcher?.data?.searchResults || {
    results: NO_PREDICTIVE_SEARCH_RESULTS,
    totalResults: 0,
  };

  // capture the search input element as a ref
  useEffect(() => {
    if (searchInputRef.current) return;
    searchInputRef.current = document.querySelector('input[type="search"]');
  }, []);

  return {...search, searchInputRef, searchTerm, state: searchFetcher.state};
}

/**
 * Converts a plural search type to a singular search type
 *
 * @example
 * ```js
 * pluralToSingularSearchType('articles'); // => 'ARTICLE'
 * pluralToSingularSearchType(['articles', 'products']); // => 'ARTICLE,PRODUCT'
 * ```
 * @param {| NormalizedPredictiveSearchResults[number]['type']
 *     | Array<NormalizedPredictiveSearchResults[number]['type']>} type
 */
function pluralToSingularSearchType(type) {
  const plural = {
    articles: 'ARTICLE',
    collections: 'COLLECTION',
    pages: 'PAGE',
    products: 'PRODUCT',
    queries: 'QUERY',
  };

  if (typeof type === 'string') {
    return plural[type];
  }

  return type.map((t) => plural[t]).join(',');
}

/**
 * @typedef {| PredictiveCollectionFragment['image']
 *   | PredictiveArticleFragment['image']
 *   | PredictiveProductFragment['variants']['nodes'][0]['image']} PredicticeSearchResultItemImage
 */

/**
 * @typedef {{
 *   __typename: string | undefined;
 *   handle: string;
 *   id: string;
 *   image?: PredicticeSearchResultItemImage;
 *   price?: PredictiveSearchResultItemPrice;
 *   styledTitle?: string;
 *   title: string;
 *   url: string;
 * }} NormalizedPredictiveSearchResultItem
 */
/**
 * @typedef {Array<
 *   | {type: 'queries'; items: Array<NormalizedPredictiveSearchResultItem>}
 *   | {type: 'products'; items: Array<NormalizedPredictiveSearchResultItem>}
 *   | {type: 'collections'; items: Array<NormalizedPredictiveSearchResultItem>}
 *   | {type: 'pages'; items: Array<NormalizedPredictiveSearchResultItem>}
 *   | {type: 'articles'; items: Array<NormalizedPredictiveSearchResultItem>}
 * >} NormalizedPredictiveSearchResults
 */
/**
 * @typedef {{
 *   results: NormalizedPredictiveSearchResults;
 *   totalResults: number;
 * }} NormalizedPredictiveSearch
 */
/**
 * @typedef {{
 *   searchResults: {
 *     results: SearchQuery | null;
 *     totalResults: number;
 *   };
 *   searchTerm: string;
 * }} FetchSearchResultsReturn
 */
/** @typedef {Class<useFetcher<NormalizedPredictiveSearchResults>>>} ChildrenRenderProps */
/**
 * @typedef {{
 *   action?: FormProps['action'];
 *   className?: string;
 *   children: (passedProps: ChildrenRenderProps) => React.ReactNode;
 *   [key: string]: unknown;
 * }} SearchFromProps
 */
/**
 * @typedef {{
 *   goToSearchResult: (event: React.MouseEvent<HTMLAnchorElement>) => void;
 *   items: NormalizedPredictiveSearchResultItem[];
 *   searchTerm: UseSearchReturn['searchTerm'];
 *   type: NormalizedPredictiveSearchResults[number]['type'];
 * }} SearchResultTypeProps
 */
/**
 * @typedef {Pick<SearchResultTypeProps, 'goToSearchResult'> & {
 *   item: NormalizedPredictiveSearchResultItem;
 * }} SearchResultItemProps
 */
/** @typedef {Class<useFetcher>['state']>} UseSearchReturn */

/** @typedef {import('@remix-run/react').FormProps} FormProps */
/** @typedef {import('../../../storefrontapi.generated.js').PredictiveProductFragment} PredictiveProductFragment */
/** @typedef {import('../../../storefrontapi.generated.js').PredictiveCollectionFragment} PredictiveCollectionFragment */
/** @typedef {import('../../../storefrontapi.generated.js').PredictiveArticleFragment} PredictiveArticleFragment */
/** @typedef {import('../../../storefrontapi.generated.js').SearchQuery} SearchQuery */
