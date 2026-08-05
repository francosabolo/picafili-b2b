import {useState} from 'react';
import styles from './styles.module.scss';
import {IconCaret} from '../Icon/Icon';

export function Accordion({
  children,
  accordionTitle,
  contentClassName,
  isOpenOnRender = false,
}) {
  const [isOpen, setIsOpen] = useState(isOpenOnRender);

  return (
    <div
      className={styles.accordionWrapper}
      {...(isOpen ? {'data-open': true} : {})}
    >
      <div
        className={styles.accordionContainer}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{accordionTitle}</span>
        <span className={styles.accordionArrow}>
          <IconCaret direction={isOpen ? 'up' : 'down'} />
        </span>
      </div>
      {isOpen && <div className={contentClassName}>{children}</div>}
    </div>
  );
}
