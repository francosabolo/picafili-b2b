import {IconCaret, IconXMark} from '~/components/Icon/Icon.jsx';
import {useMemo, useState} from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from '@remix-run/react';
import useDebounce from 'react-use/esm/useDebounce.js';
import styles from './styles.module.scss';
import {useTranslation} from '~/i18n/index.jsx';

const PRICE_RANGE_FILTER_DEBOUNCE = 500;
const FILTER_URL_PREFIX = 'filter.';

export function FilterElement({filter}) {
  const {t} = useTranslation();
  const [params] = useSearchParams();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (filter?.values.length <= 1) {
    return null;
  }

  const handleClick = (option) => {
    setIsOpen(false);
  };

  const filterClassName = filter.id
    .split('.')
    .pop()
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div
      className={`${styles.filterElement} ${styles[filterClassName]}`}
      {...(isOpen ? {'data-open': true} : {})}
    >
      <button
        type="button"
        className={styles.filterAttrTitle}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* "Color: todos" en vez de "Color" a secas: sin el sufijo el control
            se leía como un dato del producto, no como un filtro sin aplicar. */}
        <span className={styles.filterLabel}>{filter.label}:</span>{' '}
        <span className={styles.filterValue}>
          {t('collections.filters.all')}
        </span>{' '}
        <span className={styles.icon}>
          <IconCaret direction={isOpen ? 'up' : 'down'} />
        </span>
      </button>
      {isOpen && (
        <div className={styles.filtersList}>
          {filter?.values?.map((option, i) => {
            if (option.count == 0) {
              return;
            }

            return (
              <button
                type="button"
                key={'option--' + i}
                className={styles.filterOption}
                onClick={() => handleClick(option)}
              >
                {filterRenderer(filter, option, params, location)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppliedFilterElement({selectedOption, filter, appliedFilters}) {
  const [params] = useSearchParams();
  const location = useLocation();

  return (
    <div
      className={`${styles.filterElement} ${styles.appliedFilter}`}
      key={`applied--${filter?.label}-${JSON.stringify(filter?.filter)}`}
    >
      <span className="flex-grow gap-1">
        {filter?.label}
        {': '}
        {selectedOption?.label}
      </span>
      <Link
        to={getAppliedFilterLink(selectedOption, params, location)}
        preventScrollReset
      >
        <IconXMark viewBox="8 2 8 20" className={'w-5 h-5'} />
      </Link>
    </div>
  );
}

const filterRenderer = (filter, option, params, location) => {
  switch (filter.type) {
    case 'PRICE_RANGE':
      const priceFilter = params.get(`${FILTER_URL_PREFIX}price`);
      const price = priceFilter ? JSON.parse(priceFilter) : undefined;
      const min = isNaN(Number(price?.min)) ? undefined : Number(price?.min);
      const max = isNaN(Number(price?.max)) ? undefined : Number(price?.max);

      return <PriceRangeFilter min={min} max={max} styles={styles} />;

    default:
      const to = getFilterLink(option.input, params, location);

      return (
        <Link
          className="focus:underline hover:underline"
          prefetch="intent"
          to={to}
          preventScrollReset
        >
          {option.swatch && (
            <SwatchElement
              image={option?.swatch?.image?.image?.url}
              color={option?.swatch?.color}
            />
          )}
          {option.label}
          <span>({option.count})</span>
        </Link>
      );
  }
};

/**
 * @param {{image?: string; color?: string}} props
 */
const SwatchElement = ({image, color}) => (
  <span
    className={`${styles.swatchElement} ${
      image ? styles.swatchImage : styles.swatchColor
    }`}
    style={{
      backgroundImage: image ? `url(${image})` : undefined,
      backgroundColor: color ? color : undefined,
    }}
  />
);

/**
 * @param {{max?: number; min?: number}}
 */
function PriceRangeFilter({max, min, styles}) {
  const location = useLocation();

  location.search = location?.search
    ?.replace(/&cursor=[^&]*/g, '')
    .replace(/&direction=[^&]*/g, '');

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const navigate = useNavigate();

  const [minPrice, setMinPrice] = useState(min);
  const [maxPrice, setMaxPrice] = useState(max);

  useDebounce(
    () => {
      if (minPrice === undefined && maxPrice === undefined) {
        params.delete(`${FILTER_URL_PREFIX}price`);
        navigate(`${location.pathname}?${params.toString()}`, {
          preventScrollReset: true,
        });
        return;
      }

      const price = {
        ...(minPrice === undefined ? {} : {min: minPrice}),
        ...(maxPrice === undefined ? {} : {max: maxPrice}),
      };
      const newParams = filterInputToParams({price}, params);
      navigate(`${location.pathname}?${newParams.toString()}`, {
        preventScrollReset: true,
      });
    },
    PRICE_RANGE_FILTER_DEBOUNCE,
    [minPrice, maxPrice],
  );

  const onChangeMax = (event) => {
    const value = event.target.value;
    const newMaxPrice = Number.isNaN(parseFloat(value))
      ? undefined
      : parseFloat(value);
    setMaxPrice(newMaxPrice);
  };

  const onChangeMin = (event) => {
    const value = event.target.value;
    const newMinPrice = Number.isNaN(parseFloat(value))
      ? undefined
      : parseFloat(value);
    setMinPrice(newMinPrice);
  };

  return (
    <div className="flex flex-col">
      <label className="mb-4">
        <span>from</span>
        <input
          name="minPrice"
          className={`text-black`}
          type="number"
          value={minPrice ?? ''}
          placeholder={'$'}
          onChange={onChangeMin}
        />
      </label>
      <label>
        <span>to</span>
        <input
          name="maxPrice"
          className={`text-black ${styles.PriceRangeInput}`}
          type="number"
          value={maxPrice ?? ''}
          placeholder={'$'}
          onChange={onChangeMax}
        />
      </label>
    </div>
  );
}

/**
 * @param {string | ProductFilter} rawInput
 * @param {URLSearchParams} params
 */
function filterInputToParams(rawInput, params) {
  const input = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;

  Object.entries(input).forEach(([key, value]) => {
    if (params.has(`${FILTER_URL_PREFIX}${key}`, JSON.stringify(value))) {
      return;
    }
    if (key === 'price') {
      // For price, we want to overwrite
      params.set(`${FILTER_URL_PREFIX}${key}`, JSON.stringify(value));
    } else {
      params.append(`${FILTER_URL_PREFIX}${key}`, JSON.stringify(value));
    }
  });

  return params;
}

/**
 *
 * @param rawInput
 * @param params
 * @param location
 * @returns {string}
 */
function getFilterLink(rawInput, params, location) {
  const paramsClone = new URLSearchParams(params);
  const newParams = filterInputToParams(rawInput, paramsClone);

  const newFilterParams = newParams
    .toString()
    ?.replace(/&cursor=[^&]*/g, '')
    .replace(/direction=[^&]*/g, '')
    .replace(/&direction=[^&]*/g, '');

  return `${location.pathname}?${newFilterParams}`;
}

function getAppliedFilterLink(filter, params, location) {
  const paramsClone = new URLSearchParams(params);

  Object.entries(filter.filter).forEach(([key, value]) => {
    const fullKey = FILTER_URL_PREFIX + key;
    paramsClone.delete(fullKey, JSON.stringify(value));
  });
  return `${location.pathname}?${paramsClone.toString()}`;
}
