import {json} from '@shopify/remix-oxygen';
import {useTranslation} from '~/i18n/index.jsx';
import {canSeePricesOnServer, gatePrices} from '~/lib/price-gating.server.js';
import {withRetailCompareAt} from '~/lib/retail-prices.server.js';
import {pageTitle} from '~/lib/utils.js';
import {Form, useLoaderData, useNavigation, useSubmit} from '@remix-run/react';
import {Image} from '@shopify/hydrogen';
import {QUICK_ORDER_SEARCH_QUERY} from '~/graphql/quicksearch/quickOrderQuery.js';
import {PageWidthContainer} from '~/components/PageWidthContainer/PageWidthContainer.jsx';
import {ProductPrice} from '~/components/ProductPrice/ProductPrice.jsx';
import AvailabilityStatus from '~/components/AvailabilityStatus/AvailabilityStatus.jsx';
import {QuoteItemActions} from '~/components/QuoteQuickSearchItemActions/QuoteQuickSearchItemActions.jsx';
import styles from '~/styles/pages/QuickOrder.module.scss';
import {useAccountState} from '~/context/AccountStateContext.jsx';
import {getBuyerVariables} from '~/lib/b2b.server.js';

const RESULTS_LIMIT = 24;

/**
 * @type {MetaFunction}
 */
export const meta = ({matches}) => {
  return [{title: pageTitle(matches, 'quick-order.title')}];
};

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, context}) {
  const params = new URL(request.url).searchParams;
  const searchTerm = String(params.get('q') || '').trim();
  // Cada `f` lleva el input JSON de un filtro tal como lo devuelve Shopify, así
  // que sirve para cualquier filtro que la tienda exponga (color, material…)
  // sin que este código tenga que conocerlos de antemano. Se acumulan: elegir
  // color y material filtra por los dos.
  const rawFilters = params.getAll('f').filter(Boolean);

  const productFilters = rawFilters
    .map((raw) => {
      try {
        return JSON.parse(raw);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);

  // Sin término de búsqueda se muestra el catálogo igual: una pantalla de
  // quick order que arranca vacía obliga a adivinar qué escribir. El asterinsco
  // solo hace prefix match: "pica" encuentra "Picamimito".
  const query = searchTerm ? `${searchTerm}*` : '*';

  const {search} = await context.storefront.query(QUICK_ORDER_SEARCH_QUERY, {
    variables: {
      ...getBuyerVariables(context),
      query,
      first: RESULTS_LIMIT,
      productFilters: productFilters.length ? productFilters : undefined,
    },
  });

  const products = (search?.nodes ?? []).filter(
    (node) => node?.variants?.nodes?.length,
  );

  // El filtro de precio necesita rango, no un select: se deja afuera.
  const filterGroups = (search?.productFilters ?? [])
    .filter((filter) => filter.id !== 'filter.v.price')
    .map((filter) => ({
      id: filter.id,
      label: filter.label,
      values: (filter.values ?? []).map((value) => ({
        label: value.label,
        count: value.count,
        input: value.input,
      })),
    }))
    .filter((filter) => filter.values.length > 0);

  return json({
    searchTerm,
    rawFilters,
    products: await withRetailCompareAt(
      context,
      gatePrices(products, canSeePricesOnServer(request, context.b2b)),
    ),
    filterGroups,
    // Cuántos resultados quedaron afuera del tope: mejor decirlo que hacer de
    // cuenta que el catálogo termina acá.
    totalCount: search?.totalCount ?? products.length,
    limit: RESULTS_LIMIT,
  });
}

export default function QuickOrder() {
  const {t} = useTranslation();
  const {searchTerm, rawFilters, products, filterGroups, totalCount} =
    useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSearching = navigation.state !== 'idle';
  const hiddenResults = Math.max(0, (totalCount ?? 0) - products.length);

  return (
    <PageWidthContainer>
      <div className={styles.quickOrder}>
        <header className={styles.heading}>
          <h1>{t('quick-order.title')}</h1>
          <p>{t('quick-order.lead')}</p>
        </header>

        <Form method="get" className={styles.searchForm}>
          <input
            type="search"
            name="q"
            defaultValue={searchTerm}
            placeholder={t('quick-order.search-placeholder')}
            aria-label={t('quick-order.search-label')}
          />
          {filterGroups.map((group) => (
            <select
              key={group.id}
              name="f"
              defaultValue={
                group.values.find((value) => rawFilters.includes(value.input))
                  ?.input ?? ''
              }
              aria-label={t('quick-order.filter-by', {label: group.label})}
              className={styles.typeSelect}
              onChange={(event) => submit(event.currentTarget.form)}
            >
              <option value="">
                {t('quick-order.filter-all', {label: group.label})}
              </option>
              {group.values.map((value) => (
                <option key={value.input} value={value.input}>
                  {value.label} ({value.count})
                </option>
              ))}
            </select>
          ))}
          <button type="submit">{t('quick-order.search')}</button>
        </Form>

        {/* El termino de busqueda va interpolado en la frase y no dentro de un
            <strong>: partir la oracion alrededor del componente la vuelve
            intraducible, porque el orden de las palabras cambia por idioma. */}
        {!isSearching && products.length === 0 && (
          <p className={styles.empty}>
            {t('quick-order.no-results', {term: searchTerm})}
          </p>
        )}

        {products.length > 0 && (
          <>
            <div className={styles.resultsBar}>
              <span>
                {searchTerm
                  ? t(
                      products.length === 1
                        ? 'quick-order.results-one'
                        : 'quick-order.results-many',
                      {count: products.length, term: searchTerm},
                    )
                  : t('quick-order.whole-catalog', {count: products.length})}
                {hiddenResults > 0 &&
                  ` ${t('quick-order.of-total', {total: totalCount})}`}
              </span>
              <span className={styles.downloadActions}>
                <DownloadQuoteButton
                  products={products}
                  searchTerm={searchTerm}
                />
                <PriceListLink />
              </span>
            </div>
            <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>{t('quick-order.col-product')}</span>
                <span>{t('quick-order.col-availability')}</span>
                <span>{t('quick-order.col-price')}</span>
                <span className={styles.addColumn}>
                  {t('quick-order.col-add')}
                </span>
              </div>
              {products.map((product) => (
                <QuickOrderRow key={product.id} product={product} />
              ))}
            </div>
            {hiddenResults > 0 && (
              <p className={styles.truncated}>
                {t(
                  hiddenResults === 1
                    ? 'quick-order.truncated-one'
                    : 'quick-order.truncated-many',
                  {count: hiddenResults, term: searchTerm},
                )}
              </p>
            )}
          </>
        )}
      </div>
    </PageWidthContainer>
  );
}

/**
 * Lista de precios completa (E12).
 *
 * A diferencia del boton de al lado, el CSV lo genera el SERVIDOR
 * (/api/lista-precios.csv): asi el permiso se chequea antes de leer el
 * catalogo. Es un <a> y no un fetch para que el navegador maneje la descarga.
 */
function PriceListLink() {
  const {canSeePrices} = useAccountState();
  const {t} = useTranslation();

  if (!canSeePrices) return null;

  return (
    <a className={styles.downloadButton} href="/api/lista-precios.csv" download>
      {t('quoting.download-price-list')}
    </a>
  );
}

/**
 * Descarga los resultados como CSV para cotizar offline.
 * Respeta el gating: sin cuenta aprobada no se exportan precios.
 */
function DownloadQuoteButton({products, searchTerm}) {
  const {canSeePrices} = useAccountState();
  const {t} = useTranslation();

  const handleDownload = () => {
    const header = canSeePrices
      ? ['SKU', 'Producto', 'Marca', 'Disponibilidad', 'Precio', 'Moneda']
      : ['SKU', 'Producto', 'Marca', 'Disponibilidad'];

    const rows = products.map((product) => {
      const variant = product?.variants?.nodes?.[0];
      const base = [
        variant?.sku ?? '',
        product.title,
        product.vendor ?? '',
        variant?.availableForSale ? 'Disponible' : 'Sin stock',
      ];

      if (!canSeePrices) return base;

      return base.concat([
        variant?.price?.amount ?? '',
        variant?.price?.currencyCode ?? '',
      ]);
    });

    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');

    const blob = new Blob(['﻿' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cotizacion-${searchTerm || 'catalogo'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      className={styles.downloadButton}
      onClick={handleDownload}
    >
      {t('quoting.download-quote')}
    </button>
  );
}

function QuickOrderRow({product}) {
  const variant = product?.variants?.nodes?.[0];

  if (!variant) return null;

  return (
    <div className={styles.row}>
      <div className={styles.product}>
        {variant?.image?.url && (
          <Image
            data={variant.image}
            width={56}
            height={56}
            className={styles.thumb}
            alt={variant.image.altText || product.title}
          />
        )}
        <div>
          <span className={styles.title}>{product.title}</span>
          <span className={styles.sku}>
            {variant.sku ? variant.sku : 'Sin SKU'}
            {product.vendor ? ` · ${product.vendor}` : ''}
          </span>
        </div>
      </div>

      <div className={styles.availability}>
        <AvailabilityStatus
          availableForSale={variant.availableForSale}
          currentlyNotInStock={variant.currentlyNotInStock}
          quantityAvailable={variant.quantityAvailable}
        />
      </div>

      <div className={styles.price}>
        <ProductPrice product={product} />
      </div>

      <div className={styles.actions}>
        <QuoteItemActions
          quoteItem={variant}
          quantity={1}
          key={variant.id}
          viewport={'desktop'}
        />
      </div>
    </div>
  );
}

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
