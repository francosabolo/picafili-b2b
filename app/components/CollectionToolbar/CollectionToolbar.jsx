import {FiltersAside, FiltersDrawer} from '~/components/Filters/Filters.jsx';
import SorterMenu from '~/components/SorterMenu/SorterMenu.jsx';
import {deleteAllFilters} from '~/components/FiltersApplied/FiltersApplied.jsx';
import {ListViewToggle} from '~/components/ListViewToggle/ListViewToggle.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {Link, useLocation, useSearchParams} from '@remix-run/react';
import styles from './styles.module.scss';

/**
 * Barra de filtros, orden y vista del listado.
 *
 * **Qué estaba mal.** Los tres controles se renderizaban por separado y nadie
 * los alineaba: los filtros arriba a la izquierda bajo un rótulo "FILTRAR POR:",
 * "Ordenar" a la derecha como un **título gigante** con su desplegable debajo, y
 * el selector de vista en una tercera fila flotando sola. Tres bloques, tres
 * alturas distintas, y un hueco enorme en el medio. Ningún catálogo se ve así
 * porque el comprador lee esa zona como **una sola herramienta**.
 *
 * **Qué hace ahora**, que es lo que hace cualquier catálogo:
 *
 * - Una fila, una línea de base. Filtros a la izquierda; a la derecha el conteo,
 *   el orden y la vista, que es donde el ojo los busca.
 * - "Ordenar" deja de ser un encabezado y pasa a ser la etiqueta del control:
 *   `Ordenar: Destacados`. Un título de sección para un desplegable le da a un
 *   control secundario el peso de un rubro de la página.
 * - **Aparece el conteo de resultados.** Era lo que más se extrañaba: sin él,
 *   aplicar un filtro no da ninguna devolución de que hizo algo.
 * - Los filtros aplicados van en su propia fila, abajo, y solo si hay alguno.
 *   Mezclados con los controles competían con ellos.
 *
 * En mobile los filtros se pliegan al botón que abre el drawer que ya existía;
 * orden y vista se quedan en la barra porque son de un toque.
 *
 * @param {{filters: Array<object>, appliedFilters: Array<object>, count?: number,
 *   heading?: string, label?: string}}
 */
export function CollectionToolbar({
  filters = [],
  appliedFilters = [],
  count,
  heading,
  label,
}) {
  const {t} = useTranslation();
  const [params] = useSearchParams();
  const location = useLocation();

  const applied = appliedFilters.filter((f) => !f?.filter?.tag);

  return (
    <div className={styles.toolbar}>
      <div className={styles.row}>
        {/* Escritorio: los selectores a la vista. El drawer de mobile lo monta
            FiltersAside, que ademas trae el boton que lo abre. */}
        <div className={styles.filters}>
          <FiltersDrawer filters={filters} appliedFilters={appliedFilters} />
        </div>

        <div className={styles.mobileFilters}>
          <FiltersAside
            filters={filters}
            appliedFilters={appliedFilters}
            heading={heading}
            label={label}
            useSortMenu={false}
          />
        </div>

        <div className={styles.controls}>
          {typeof count === 'number' && (
            <span className={styles.count}>
              {t('collections.count', {count})}
            </span>
          )}
          <SorterMenu inline />
          <ListViewToggle />
        </div>
      </div>

      {/* Solo aparece si hay algo que limpiar. Cada filtro ya se quita de a uno
          desde su propio chip; esto es el atajo para volver a cero. */}
      {applied.length > 0 && (
        <div className={styles.appliedRow}>
          <Link
            className={styles.clearAll}
            to={deleteAllFilters(applied, params, location)}
            preventScrollReset
          >
            {t('collections.filters.clear')}
          </Link>
        </div>
      )}
    </div>
  );
}
