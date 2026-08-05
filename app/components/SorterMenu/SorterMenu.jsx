import {Link, useLocation, useSearchParams} from '@remix-run/react';
import {Menu} from '@headlessui/react';
import styles from '~/components/SorterMenu/styles.module.scss';
import {IconCaret, IconFilters} from '~/components/Icon/Icon.jsx';
import {useState} from 'react';
import {FiltersDrawer} from '~/components/Filters/Filters.jsx';
import {useTranslation} from '~/i18n/index.jsx';

/**
 * @param {{inline?: boolean}} inline mete el rotulo DENTRO del control
 *   ("Ordenar: Destacados") en vez de ponerlo como encabezado aparte. El
 *   encabezado suelto le daba a un desplegable secundario el peso visual de un
 *   rubro de la pagina.
 */
export default function SorterMenu({inline = false}) {
  const {t} = useTranslation();
  const sortHeading = t('collections.sort.heading');
  const sortItems = [
    {
      label: t('collections.sort.featured'),
      key: 'featured',
    },
    {
      label: t('collections.sort.price-low-high'),
      key: 'price-low-high',
    },
    {
      label: t('collections.sort.price-high-low'),
      key: 'price-high-low',
    },
    {
      label: t('collections.sort.best-selling'),
      key: 'best-selling',
    },
    {
      label: t('collections.sort.newest'),
      key: 'newest',
    },
  ];
  const [params] = useSearchParams();
  const location = useLocation();
  const activeItem = sortItems.find((item) => item.key === params.get('sort'));

  return (
    <>
      <Menu
        as="div"
        className={`${styles.sortMenu} ${inline ? styles.inline : ''}`}
      >
        {!inline && <span className={styles.sortTitle}>{sortHeading}</span>}
        <Menu.Button className={styles.sortElement}>
          <span className={styles.sortButton}>
            {inline && (
              <span className={styles.inlineLabel}>{sortHeading}:</span>
            )}
            <span>{(activeItem || sortItems[0]).label}</span>
            <span className={styles.icon}>
              <IconCaret />
            </span>
          </span>
          <Menu.Items as="nav" data-open className={styles.sortItems}>
            {sortItems?.map((item) => (
              <Menu.Item key={item.label}>
                {() => (
                  <Link
                    className={`block text-sm pb-2  ${
                      activeItem?.key === item.key ? 'font-bold' : 'font-normal'
                    }`}
                    to={getSortLink(item.key, params, location)}
                    preventScrollReset
                  >
                    {item.label}
                  </Link>
                )}
              </Menu.Item>
            ))}
          </Menu.Items>
        </Menu.Button>
      </Menu>
    </>
  );
}

/**
 * @param {SortParam} sort
 * @param {URLSearchParams} params
 * @param {Location} location
 */
function getSortLink(sort, params, location) {
  params.set('sort', sort);
  return `${location.pathname}?${params.toString()}`;
}

/**
 * @param {Props}
 */
export function SortFilter({
  filters,
  appliedFilters = [],
  children,
  collections = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div
        className={`flex items-center justify-between w-full ${styles.sortFilters}`}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={
            'relative flex items-center justify-center w-8 h-8 focus:ring-primary/5'
          }
        >
          <IconFilters />
        </button>
        <SorterMenu className={styles.sortFilters} />
      </div>
      <div className="flex flex-col flex-wrap md:flex-row">
        <div
          className={`transition-all duration-200 ${
            isOpen
              ? 'opacity-100 min-w-full md:min-w-[240px] md:w-[240px] md:pr-8 max-h-full'
              : 'opacity-0 md:min-w-[0px] md:w-[0px] pr-0 max-h-0 md:max-h-full'
          }`}
        >
          <FiltersDrawer filters={filters} appliedFilters={appliedFilters} />
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </>
  );
}
