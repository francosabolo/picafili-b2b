import {useEffect, useState} from 'react';
import {Link, useLocation, useSearchParams} from '@remix-run/react';
import {IconXMark} from '~/components/Icon/Icon.jsx';
import styles from './styles.module.scss';

const FILTER_URL_PREFIX = 'filter.';

export function FiltersApplied({filters = []}) {
  const [params] = useSearchParams();
  const location = useLocation();
  const [filtersApplied, setFiltersApplied] = useState(filters);

  useEffect(() => {
    setFiltersApplied(filters);
  }, [params]);

  if (filtersApplied.length < 1) return null;
  if (filtersApplied.length === 1 && filtersApplied[0]?.filter?.tag)
    return null;

  return (
    <>
      <div className={styles.appliedFilters}>
        <div className={`flex flex-wrap gap-2 min-h-9`}>
          {filters.map((filter, i) => {
            if (filter?.filter?.tag) return null;

            return (
              <Link
                to={getAppliedFilterLink(filter, params, location)}
                className={`flex border rounded-full gap ${styles.filterBullet}`}
                key={`${filter?.label}-${JSON.stringify(filter?.filter)}--${i}`}
                preventScrollReset
              >
                <span className="flex-grow">{filter?.label}</span>
                <span>
                  <IconXMark viewBox="8 2 8 20" />
                </span>
              </Link>
            );
          })}
          {filtersApplied && (
            <Link
              to={deleteAllFilters(filtersApplied, params, location)}
              className={`flex px-2 ${styles.clearFilters}`}
              preventScrollReset
            >
              <span className="flex-grow">Limpiar filtros</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * @param {AppliedFilter} filter
 * @param {URLSearchParams} params
 * @param {Location} location
 */
function getAppliedFilterLink(filter, params, location) {
  const paramsClone = new URLSearchParams(params);
  Object.entries(filter.filter).forEach(([key, value]) => {
    const fullKey = FILTER_URL_PREFIX + key;
    paramsClone.delete(fullKey, JSON.stringify(value));
  });
  return `${location.pathname}?${paramsClone.toString()}`;
}

/**
 * URL sin ninguno de los filtros aplicados.
 *
 * Se exporta porque el "limpiar todo" ahora vive en la barra del listado, no
 * enterrado dentro del bloque de filtros: habia SEIS copias del link en el DOM
 * —FiltersDrawer, FiltersAside y el drawer lo renderizaban cada uno— y ninguna
 * quedaba visible en escritorio, asi que no habia forma de limpiar todo.
 */
export function deleteAllFilters(appliedFilters, params, location) {
  const paramsClone = new URLSearchParams(params);

  appliedFilters.forEach((filter) => {
    Object.entries(filter.filter).forEach(([key, value]) => {
      const fullKey = FILTER_URL_PREFIX + key;
      paramsClone.delete(fullKey, JSON.stringify(value));
    });
  });
  return `${location.pathname}?${paramsClone.toString()}`;
}
