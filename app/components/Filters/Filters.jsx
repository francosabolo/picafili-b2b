import styles from './styles.module.scss';
import {FiltersApplied} from '~/components/FiltersApplied/FiltersApplied.jsx';
import {
  FilterElement,
  AppliedFilterElement,
} from '~/components/FilterElement/FilterElement.jsx';
import SorterMenu from '~/components/SorterMenu/SorterMenu.jsx';
import {Aside} from '~/components/Aside/Aside.jsx';
import {IconFilters} from '~/components/Icon/Icon';
import {useTranslation} from '~/i18n/index.jsx';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from '@remix-run/react';

export function FiltersBar({filters, appliedFilters = [], useSortMenu = true}) {
  return (
    <>
      <div className={styles.filtersBar}>
        <FiltersDrawer filters={filters} appliedFilters={appliedFilters} />
        {useSortMenu && <SorterMenu className={styles.filtersBar} />}
      </div>
    </>
  );
}

/**
 * @param {Omit<Props, 'children'>}
 */
export function FiltersDrawer({filters = [], appliedFilters = []}) {
  const {t} = useTranslation();
  const [params] = useSearchParams();
  const location = useLocation();

  return (
    <>
      <nav className={styles.filtersDrawerContainer}>
        <h4 className={styles.filterTitle}>
          {t('collections.filters.heading')}
        </h4>
        <FiltersApplied filters={appliedFilters} />
        <div className={styles.filtersContainer}>
          <div className={styles.filtersWrapper}>
            {filters
              .filter((filter) => filter?.values.length > 1)
              .map((filter, i) => (
                <div key={filter.id}>
                  {/* Checking if filter is applied */}
                  {appliedFilters?.find(
                    (appliedFilter) => appliedFilter?.id === filter.id,
                  ) ? (
                    <AppliedFilterElement
                      selectedOption={appliedFilters.find(
                        (appliedFilter) => appliedFilter.id === filter.id,
                      )}
                      filter={filters.find((element) => element == filter)}
                      appliedFilters={appliedFilters}
                      key={'selectedFilterDrawer--' + filter.id}
                    />
                  ) : (
                    <FilterElement
                      filter={filter}
                      i={i}
                      key={'filterDrawer--' + filter.id}
                    />
                  )}
                </div>
              ))}
          </div>
          <div className={styles.clearFilters}>
            {appliedFilters.length > 0 && (
              <Link
                to={deleteAllFilters(appliedFilters, params, location)}
                className={`flex px-2 `}
                preventScrollReset
              >
                <span className="flex-grow">Limpiar filtros</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

export function FiltersAside({
  filters = [],
  appliedFilters = [],
  label = 'filters',
  useSortMenu = true,
  heading,
}) {
  const [params] = useSearchParams();
  const location = useLocation();

  return (
    <div className={styles.filtersAside}>
      <div className={styles.toggleContainer}>
        {useSortMenu && (
          <div className={styles.sortMenuWrapper}>
            <SorterMenu />
          </div>
        )}
        <a className={styles.filersToggle} href="#mobile-filters-aside">
          <IconFilters viewBox="-5 -5 25 28" />
          {label}
        </a>
      </div>
      <FiltersApplied filters={appliedFilters} />
      <Aside
        id="mobile-filters-aside"
        className={styles.filtersAsideWrapper}
        heading={heading}
      >
        <div className={styles.filtersAsideContainer}>
          <nav className={styles.filtersContainer}>
            <h4 className={styles.filterTitle}>Filtrando Por:</h4>
            <FiltersApplied filters={appliedFilters} />
            <div className={styles.filtersWrapper}>
              {filters
                .filter((filter) => filter?.values.length > 1)
                .map((filter, i) => (
                  <div key={filter.id}>
                    {/* Checking if filter is applied */}
                    {appliedFilters?.find(
                      (appliedFilter) => appliedFilter?.id === filter.id,
                    ) ? (
                      <AppliedFilterElement
                        selectedOption={appliedFilters.find(
                          (appliedFilter) => appliedFilter.id === filter.id,
                        )}
                        filter={filters.find((element) => element == filter)}
                        appliedFilters={appliedFilters}
                        key={'selectedFilter--' + filter.id}
                      />
                    ) : (
                      <FilterElement
                        filter={filter}
                        i={i}
                        key={'filter--' + filter.id}
                      />
                    )}
                  </div>
                ))}
            </div>
            <div className={styles.clearFilters}>
              {appliedFilters.length > 0 && (
                <Link
                  to={deleteAllFilters(appliedFilters, params, location)}
                  className={`flex px-2 `}
                  preventScrollReset
                >
                  <span className="flex-grow">Limpiar filtros</span>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </Aside>
    </div>
  );
}

function deleteAllFilters(appliedFilters, params, location) {
  const paramsClone = new URLSearchParams(params);

  appliedFilters.forEach((filter) => {
    Object.entries(filter.filter).forEach(([key, value]) => {
      const fullKey = 'filter.' + key;
      paramsClone.delete(fullKey, JSON.stringify(value));
    });
  });
  return `${location.pathname}?${paramsClone.toString()}`;
}

/**
 * @typedef {{
 *   label: string;
 *   filter: ProductFilter;
 * }} AppliedFilter
 */
/**
 * @typedef {| 'price-low-high'
 *   | 'price-high-low'
 *   | 'best-selling'
 *   | 'newest'
 *   | 'featured'} SortParam
 */
/**
 * @typedef {{
 *   filters: Filter[];
 *   appliedFilters?: AppliedFilter[];
 *   children: React.ReactNode;
 *   collections?: Array<{handle: string; title: string}>;
 * }} Props
 */

/** @typedef {import('react').SyntheticEvent} SyntheticEvent */
/** @typedef {import('@remix-run/react').Location} Location */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Filter} Filter */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').ProductFilter} ProductFilter */
