import styles from './styles.module.scss';
import {
  PredictiveSearchForm,
  PredictiveSearchResults,
} from '~/components/Search/Search.jsx';
import {useEffect, useRef, useState} from 'react';
import {IconSearch, IconClose} from '~/components/Icon/Icon';
import {useNavigation} from '@remix-run/react';
import {useTranslation} from '~/i18n/index.jsx';

/**
 * Buscador del header: un ícono que abre una **barra de ancho completo**.
 *
 * Antes era un campo de 215px que crecía con una animación de ancho, sobre un
 * gris que no es de la marca. Tres problemas, y el de fondo no es estético: en
 * un catálogo mayorista se busca por SKU y nombres largos, y en 215px no entra
 * ni "Almohadón Personalizado". Además los resultados salían de una caja
 * angosta con `overflow: hidden`, así que el nombre del producto se cortaba
 * justo donde estaba la diferencia entre una variante y otra.
 *
 * Ahora ocupa el ancho del header, como en la tienda: el campo grande, los
 * resultados abajo con el mismo ancho, y el fondo crema de la marca.
 *
 * Se conserva el nombre del componente para no tocar el header; de animado ya
 * no tiene nada, y eso también es a propósito — media segundo de animación
 * entre el click y el foco es medio segundo tipeando contra un campo que
 * todavía no existe.
 */
export function AnimatedSearchBar({className}) {
  const {t} = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const navigation = useNavigation();
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Al navegar (por ejemplo, al elegir un resultado) la barra se cierra sola:
  // dejarla abierta encima de la página a la que acabás de llegar tapa
  // justamente lo que fuiste a ver.
  useEffect(() => {
    if (navigation.state === 'loading') setIsOpen(false);
  }, [navigation.state]);

  // El foco se pone al abrir, no con `autoFocus`: ese atributo también roba el
  // foco en el primer render de la página cuando el componente se monta abierto,
  // que es justo lo que la regla de accesibilidad evita.
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleClickOutside(event) {
      if (containerRef.current?.contains(event.target)) return;
      setIsOpen(false);
    }

    function handleKey(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div className={`${styles.search} ${className ?? ''}`} ref={containerRef}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isOpen}
        aria-label={t('general.search')}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? (
          <IconClose viewBox="0 0 20 20" />
        ) : (
          <IconSearch width="20" height="20" viewBox="0 0 28 24" />
        )}
      </button>

      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.panelInner}>
            <PredictiveSearchForm className={styles.form}>
              {({fetchResults, inputRef: formInputRef}) => (
                <div className={styles.field}>
                  <IconSearch
                    className={styles.fieldIcon}
                    width="20"
                    height="20"
                    viewBox="0 0 28 24"
                  />
                  <input
                    name="q"
                    className={styles.input}
                    placeholder={t('general.search')}
                    type="search"
                    ref={(node) => {
                      inputRef.current = node;
                      if (formInputRef) formInputRef.current = node;
                    }}
                    onChange={fetchResults}
                    onFocus={fetchResults}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      const value = inputRef.current?.value;
                      window.location.href = value
                        ? `/search?q=${encodeURIComponent(value)}`
                        : '/search';
                    }}
                  />
                </div>
              )}
            </PredictiveSearchForm>

            <PredictiveSearchResults className={styles.results} />
          </div>
        </div>
      )}
    </div>
  );
}
