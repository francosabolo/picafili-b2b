import {FiltersBar, FiltersAside} from '~/components/Filters/Filters.jsx';
import styles from './styles.module.scss';
import {useEffect, useState} from 'react';
import {QuickSearchTable} from '~/components/QuickSearchTable/QuickSearchTable.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {ConsultTooltip} from '~/components/ConsultButton/ConsultButton';

export function QuickSearch({
  allFilters,
  appliedFilters = [],
  searchResults = {},
}) {
  const {t} = useTranslation();
  const [filters, setFilters] = useState(allFilters);

  useEffect(() => {
    const updatedFilters = searchResults.productFilters.filter(
      (filter) =>
        filter.id !== 'filter.p.tag' &&
        filter.id !== 'filter.p.m.product.grouped',
    );
    setFilters(updatedFilters);
  }, [searchResults]);

  return (
    <div className={styles.quickSearch}>
      <header className={styles.heading}>
        <h2 className={styles.title}>{t('product.configurator.title')}</h2>
        <p className={styles.subtitle}>{t('product.configurator.subtitle')}</p>
      </header>
      <FiltersBar
        filters={filters}
        styles={styles}
        appliedFilters={appliedFilters}
        useSortMenu={false}
      />
      <FiltersAside
        filters={filters}
        appliedFilters={appliedFilters}
        useSortMenu={false}
        heading={t('product.configurator.title')}
        label={t('product.configurator.title')}
      />
      <QuickSearchTable searchResults={searchResults} />
      <ConsultTooltip />
    </div>
  );
}
