import React from 'react';
import styles from './styles.module.scss';

const Loader = ({type = 'line'}) => {
  if (type === 'line') {
    return <div className={styles.loadingLine} />;
  }

  return (
    <div className={styles.loaderOverlay}>
      <div className={styles.loader}></div>
    </div>
  );
};

export default Loader;
