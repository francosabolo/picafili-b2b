import {useEffect, useState} from 'react';
import {Link, useNavigate} from '@remix-run/react';
import {PageWidthContainer} from '~/components/PageWidthContainer/PageWidthContainer.jsx';
import {useQuote} from '~/context/QuoteContext.jsx';
import {useAccountState} from '~/context/AccountStateContext.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {pageTitle} from '~/lib/utils.js';
import {readSavedLists, deleteList, resolveList} from '~/lib/saved-lists.js';
import styles from '~/styles/pages/SavedLists.module.scss';

/**
 * Listas de reposición guardadas — E6, "recompra en un clic".
 *
 * El B2B es reposición, no descubrimiento: el comprador pide casi siempre lo
 * mismo. Esta pantalla existe para que no tenga que volver a armar el pedido
 * producto por producto cada mes.
 *
 * @type {MetaFunction}
 */
export const meta = ({matches}) => {
  return [{title: pageTitle(matches, 'lists.nav')}];
};

export default function SavedLists() {
  const {t} = useTranslation();
  const {addQuoteItems} = useQuote();
  const {canOrder} = useAccountState();
  const navigate = useNavigate();

  // Las listas viven en localStorage, que en el servidor no existe: se leen
  // recién en el efecto para que el HTML del server y el primer render del
  // cliente coincidan (si no, hydration mismatch).
  const [lists, setLists] = useState([]);
  const [status, setStatus] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    setLists(readSavedLists());
  }, []);

  const handleLoad = async (list) => {
    setBusyId(list.id);
    setStatus(null);

    try {
      const {lines, missingIds} = await resolveList(list.items);

      if (!lines.length) {
        setStatus({type: 'error', text: t('lists.none-available')});
        return;
      }

      addQuoteItems(lines);

      // Las que ya no existen se avisan, no se descartan en silencio: el
      // comprador tiene que saber que ese producto salió del catálogo.
      setStatus({
        type: missingIds.length ? 'warning' : 'success',
        text: missingIds.length
          ? t('lists.loaded-partial', {
              added: lines.length,
              missing: missingIds.length,
            })
          : t('lists.loaded', {added: lines.length}),
      });
    } catch (error) {
      setStatus({type: 'error', text: t('lists.load-error')});
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (list) => {
    setLists(deleteList(list.id));
    setStatus(null);
  };

  if (!canOrder) {
    return (
      <PageWidthContainer>
        <div className={styles.page}>
          <h1>{t('lists.title')}</h1>
          <p className={styles.lead}>{t('lists.locked')}</p>
          <Link to="/pages/contact" className={styles.primaryLink}>
            {t('home.cta-signup')}
          </Link>
        </div>
      </PageWidthContainer>
    );
  }

  return (
    <PageWidthContainer>
      <div className={styles.page}>
        <header className={styles.head}>
          <h1>{t('lists.title')}</h1>
          <p className={styles.lead}>{t('lists.lead')}</p>
        </header>

        {status && (
          <p
            className={`${styles.status} ${styles[status.type]}`}
            role="status"
          >
            {status.text}
          </p>
        )}

        {lists.length === 0 ? (
          <div className={styles.empty}>
            <p>{t('lists.empty')}</p>
            <button
              type="button"
              className={styles.primaryLink}
              onClick={() => navigate('/compra-rapida')}
            >
              {t('home.cta-quick-order')}
            </button>
          </div>
        ) : (
          <ul className={styles.lists}>
            {lists.map((list) => (
              <li key={list.id} className={styles.list}>
                <div className={styles.listInfo}>
                  <span className={styles.listName}>{list.name}</span>
                  <span className={styles.listMeta}>
                    {t('lists.line-count', {count: list.items.length})} ·{' '}
                    {new Date(list.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.listActions}>
                  <button
                    type="button"
                    className={styles.loadButton}
                    onClick={() => handleLoad(list)}
                    disabled={busyId === list.id}
                  >
                    {busyId === list.id
                      ? t('general.loading')
                      : t('lists.load')}
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(list)}
                  >
                    {t('lists.delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageWidthContainer>
  );
}

/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */
