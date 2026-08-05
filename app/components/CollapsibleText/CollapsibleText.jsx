import {useEffect, useRef, useState} from 'react';
import {useTranslation} from '~/i18n/index.jsx';
import styles from './styles.module.scss';

/**
 * Texto largo plegado, con el original completo en el HTML.
 *
 * **El problema.** La descripción de colección se volcaba entera arriba de los
 * productos. Medido en "Hora de comer": **361 palabras, 768 px**, y sumado al
 * hero la grilla arrancaba en **y = 1583** — más de dos pantallas de scroll
 * antes de que un comprador viera un solo producto. Ese texto está escrito para
 * buscadores; el mayorista entra a la categoría a pedir.
 *
 * **Por qué plegar y no recortar.** El texto sigue completo en el DOM: se pliega
 * con CSS, no cortando la cadena. Un buscador lo indexa igual y quien quiera
 * leerlo lo abre. Recortar en el servidor perdería las dos cosas.
 *
 * Si el texto entra en el límite, no se renderiza ningún control: no tiene
 * sentido ofrecer "leer más" sobre dos líneas.
 *
 * @param {{children: React.ReactNode, lines?: number, className?: string}}
 */
export function CollapsibleText({children, lines = 3, className}) {
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef(null);
  const {t} = useTranslation();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // `scrollHeight > clientHeight` es la unica forma de saber si el clamp
    // recorto algo: depende del ancho renderizado, asi que no se puede decidir
    // en el servidor ni contando caracteres.
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <div
        ref={ref}
        className={`${styles.text} ${open ? styles.open : ''}`}
        style={open ? undefined : {WebkitLineClamp: lines}}
      >
        {children}
      </div>

      {(overflows || open) && (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? t('general.read-less') : t('general.read-more')}
        </button>
      )}
    </div>
  );
}
