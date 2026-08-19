import {json} from '@shopify/remix-oxygen';
import {DRAFT_ORDER_CREATE_MUTATION} from '~/graphql/draft-orders/draftOrders.js';
import {buildDraftOrderInput, canApplyRepDiscounts} from '~/lib/draft-order.js';

/**
 * Crea el draft order de una cotización (Admin API).
 *
 * La Storefront API no puede crear draft orders: por eso existe este endpoint
 * y por eso el `ADMIN_API_ACCESS_TOKEN` nunca sale del servidor.
 *
 * El armado y la validación del input viven en `~/lib/draft-order.js` — es
 * lógica pura y ahí se puede verificar sin levantar el worker ni tener un
 * token de Admin válido, que es justo lo que no hay en local.
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

  // El email del pedido sale de la SESIÓN, no del cuerpo. Antes lo escribía el
  // navegador: cualquiera podía emitir un presupuesto a nombre de otra
  // casilla, y el comprador tenía que tipear un dato que el portal ya sabe.
  const email = context.customerEmail ?? body?.email;

  const {input, error} = buildDraftOrderInput(
    {...body, email},
    canApplyRepDiscounts(request),
  );

  if (error) {
    return json({error}, {status: 400});
  }

  try {
    const response = await context.adminApiClient.request(
      DRAFT_ORDER_CREATE_MUTATION,
      {variables: {input}},
    );

    // La Admin API responde 200 con `errors` en el cuerpo: sin esto el
    // endpoint devolvía 200 y el cliente no podía distinguir éxito de fallo.
    if (response?.errors) {
      const status = response.errors.networkStatusCode ?? 502;
      return json({errors: response.errors}, {status});
    }

    const userErrors = response?.data?.draftOrderCreate?.userErrors ?? [];
    if (userErrors.length) {
      return json({errors: userErrors}, {status: 422});
    }

    // Sin draftOrder no hubo pedido, por mucho que la respuesta venga limpia.
    if (!response?.data?.draftOrderCreate?.draftOrder?.id) {
      return json({error: 'Shopify no devolvió el pedido'}, {status: 502});
    }

    return json(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('draftOrderCreate:', error);
    return json({error: error.message}, {status: 500});
  }
}

/** @typedef {import('@shopify/remix-oxygen').ActionFunctionArgs} ActionFunctionArgs */
