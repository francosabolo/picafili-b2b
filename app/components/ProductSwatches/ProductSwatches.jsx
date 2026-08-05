import {Link} from '@remix-run/react';
import styles from './styles.module.scss';
import {formatOptionName} from '~/lib/utils.js';

export function ProductSwatches({option}) {
  return (
    <div className={styles.productOptions} key={option.name}>
      <h5>{formatOptionName(option.name)}</h5>
      <div className={styles.productOptionsGrid}>
        {option?.values.map(({value, isAvailable, isActive, to}) => {
          return (
            <Link
              className={styles.productOptionItem}
              key={option.name + value}
              prefetch="intent"
              preventScrollReset
              to={to}
              style={{
                border: isActive ? '1px solid black' : '1px solid transparent',
                opacity: isAvailable ? 1 : 0.3,
              }}
            >
              {value}
            </Link>
          );
        })}
      </div>
      <br />
    </div>
  );
}
