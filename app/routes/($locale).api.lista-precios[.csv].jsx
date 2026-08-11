import {PRICE_LIST_QUERY} from '~/graphql/products/variantsQuery.js';
import {canSeePricesOnServer} from '~/lib/price-gating.server.js';
import {getBuyerVariables} from '~/lib/b2b.server.js';

/** Productos por página al recorrer el catálogo. */
const PAGE_SIZE = 250;
/** Tope de páginas: cortafuegos, no un límite de negocio. */
const MAX_PAGES = 20;

/**
 * Una celda CSV. Se citan todas: un título con coma o con comillas parte la
 * fila en dos y desalinea el archivo entero sin ningún error visible.
 *
 * @param {unknown} value
 */
function cell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/**
 * Lista de precios del catálogo en CSV (E12).
 *
 * Se genera **en el servidor** a propósito. El otro export del sitio —el de
 * compra rápida— arma el CSV en el navegador y decide ahí si incluye precios;
 * eso es la misma clase de gate que ya resultó ser decorativo. Acá el permiso
 * se chequea antes de leer el catálogo: sin permiso no hay archivo.
 *
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, context}) {
  if (!canSeePricesOnServer(request, context.b2b)) {
    return new Response(
      'La lista de precios está disponible para cuentas mayoristas aprobadas.',
      {status: 403, headers: {'Content-Type': 'text/plain; charset=utf-8'}},
    );
  }

  const rows = [
    [
      'SKU',
      'Producto',
      'Variante',
      'Marca',
      'Disponibilidad',
      'Precio',
      'Moneda',
      'Minimo',
      'Multiplo',
      'Precio por cantidad',
    ],
  ];

  let cursor = null;
  let pages = 0;

  do {
    const {products} = await context.storefront.query(PRICE_LIST_QUERY, {
      variables: {first: PAGE_SIZE, cursor, ...getBuyerVariables(context)},
      // Sin caché: una lista de precios servida de caché puede ser la de otro
      // catálogo B2B cuando la tienda tenga catálogos por company.
      cache: context.storefront.CacheNone(),
    });

    for (const product of products?.nodes ?? []) {
      for (const variant of product?.variants?.nodes ?? []) {
        // "Default Title" es el nombre que pone Shopify cuando el producto no
        // tiene variantes de verdad: como columna no dice nada.
        const variantTitle =
          variant?.title && variant.title !== 'Default Title'
            ? variant.title
            : '';

        const tiers = (variant?.quantityPriceBreaks?.nodes ?? [])
          .map((tier) => `${tier.minimumQuantity}+: ${tier.price?.amount}`)
          .join(' | ');

        rows.push([
          variant?.sku ?? '',
          product.title,
          variantTitle,
          product.vendor ?? '',
          variant?.availableForSale
            ? 'Disponible'
            : variant?.currentlyNotInStock
            ? 'Bajo demanda'
            : 'Sin stock',
          variant?.price?.amount ?? '',
          variant?.price?.currencyCode ?? '',
          variant?.quantityRule?.minimum ?? '',
          variant?.quantityRule?.increment ?? '',
          tiers,
        ]);
      }
    }

    cursor = products?.pageInfo?.hasNextPage
      ? products.pageInfo.endCursor
      : null;
    pages += 1;
  } while (cursor && pages < MAX_PAGES);

  const csv = rows.map((row) => row.map(cell).join(',')).join('\n');

  // El BOM (\uFEFF, escapado y no literal: el literal es whitespace
  // irregular) es lo que hace que Excel abra el archivo en UTF-8. Sin el, los
  // acentos del catalogo salen rotos.
  return new Response(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lista-de-precios.csv"',
      'Cache-Control': 'no-store',
    },
  });
}

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
