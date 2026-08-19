import {Link, useSearchParams} from '@remix-run/react';
import {useTranslation} from '~/i18n/index.jsx';
import {IconGrid, IconRows} from '~/components/Icon/Icon.jsx';
import styles from './styles.module.scss';

/**
 * Cómo se ve el listado: tarjetas o tabla comparativa.
 *
 * **Vive en la URL, no en estado de React**, y eso es a propósito:
 *
 * - El servidor la conoce, así que el HTML sale ya en la vista elegida. Con
 *   estado local el listado se renderizaría en tarjetas y saltaría a tabla al
 *   hidratar — el parpadeo que este proyecto ya arregló dos veces.
 * - Un comprador puede mandarle a un colega el link de "las mantas, en tabla,
 *   filtradas por material" y le llega igual.
 * - El botón de atrás funciona.
 */
export const LIST_VIEWS = {CARDS: 'tarjetas', TABLE: 'tabla'};

const VIEW_PARAM = 'vista';

/**
 * Vista activa según la URL. **El default es la tabla**, y cualquier valor
 * desconocido cae ahí.
 *
 * Un comprador mayorista no navega vitrina: compara SKU, specs, stock y precio
 * de varios productos y carga cantidades. Esa es la tabla. Las tarjetas —que
 * eran el default heredado de un storefront de retail— obligan a recorrer el
 * listado de a un producto para hacer lo mismo.
 *
 * @param {URLSearchParams} searchParams
 */
export function getListView(searchParams) {
  return searchParams?.get(VIEW_PARAM) === LIST_VIEWS.CARDS
    ? LIST_VIEWS.CARDS
    : LIST_VIEWS.TABLE;
}

export function ListViewToggle() {
  const [searchParams] = useSearchParams();
  const {t} = useTranslation();
  const current = getListView(searchParams);

  /**
   * Conserva el resto de los parámetros. Cambiar de vista no puede perder los
   * filtros ni el orden que el comprador ya eligió.
   *
   * La paginación sí se descarta: los cursores de una vista no significan nada
   * en la otra y arrastrarlos deja al comprador en una página que no pidió.
   */
  const linkTo = (view) => {
    const next = new URLSearchParams(searchParams);
    next.delete('cursor');
    next.delete('direction');

    if (view === LIST_VIEWS.CARDS) {
      next.delete(VIEW_PARAM);
    } else {
      next.set(VIEW_PARAM, view);
    }

    const query = next.toString();
    return query ? `?${query}` : '?';
  };

  return (
    <div
      className={styles.toggle}
      role="group"
      aria-label={t('collections.view.label')}
    >
      {[
        {
          view: LIST_VIEWS.CARDS,
          label: t('collections.view.cards'),
          Icon: IconGrid,
        },
        {
          view: LIST_VIEWS.TABLE,
          label: t('collections.view.table'),
          Icon: IconRows,
        },
      ].map(({view, label, Icon}) => (
        <Link
          key={view}
          to={linkTo(view)}
          preventScrollReset
          replace
          className={`${styles.option} ${
            current === view ? styles.active : ''
          }`}
          aria-current={current === view ? 'true' : undefined}
        >
          <Icon />
          <span className={styles.optionLabel}>{label}</span>
        </Link>
      ))}
    </div>
  );
}
