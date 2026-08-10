import {json} from '@shopify/remix-oxygen';
import {VARIANTS_BY_ID_QUERY} from '~/graphql/products/variantsQuery.js';
import {toQuoteLine} from '~/lib/quote.js';
import {getBuyerVariables} from '~/lib/b2b.server.js';

/** Tope de IDs por request: una lista de reposición no es un catálogo. */
const MAX_IDS = 100;

/**
 * Revalida variantes guardadas contra el catálogo actual.
 *
 * Lo usa "repetir pedido": las listas de reposición viven en el navegador y
 * guardan el precio del día que se armaron. Antes de volcarlas al presupuesto
 * hay que volver a preguntarle a Shopify, o se arma un pedido con precios que
 * ya no existen.
 *
 * Devuelve `lines` (las variantes que siguen vivas, ya normalizadas) y
 * `missingIds` (las que Shopify ya no reconoce: producto borrado o
 * despublicado). El que llama decide qué hacer con las que faltan — acá no se
 * descartan en silencio.
 *
 * @param {ActionFunctionArgs}
 */
export async function action({request, context}) {
  if (request.method !== 'POST') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({error: 'Invalid JSON'}, {status: 400});
  }

  const requested = Array.isArray(body?.items) ? body.items : [];

  if (!requested.length) {
    return json({lines: [], missingIds: []});
  }

  if (requested.length > MAX_IDS) {
    return json({error: `Máximo ${MAX_IDS} líneas por pedido`}, {status: 400});
  }

  // Se conserva la cantidad guardada por ID; del resto manda Shopify.
  const quantityById = new Map(
    requested.map((item) => [item?.id, Number(item?.quantity) || 1]),
  );
  const ids = [...quantityById.keys()].filter(Boolean);

  const {nodes} = await context.storefront.query(VARIANTS_BY_ID_QUERY, {
    variables: {ids, ...getBuyerVariables(context)},
  });

  // `nodes(ids:)` devuelve null en la posición de cada ID que ya no existe.
  const found = (nodes ?? []).filter((node) => node?.id);
  const foundIds = new Set(found.map((node) => node.id));

  return json({
    lines: found.map((variant) =>
      toQuoteLine(variant, quantityById.get(variant.id) ?? 1),
    ),
    missingIds: ids.filter((id) => !foundIds.has(id)),
  });
}

/** @typedef {import('@shopify/remix-oxygen').ActionFunctionArgs} ActionFunctionArgs */
