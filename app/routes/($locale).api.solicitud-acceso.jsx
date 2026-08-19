import {json} from '@shopify/remix-oxygen';
import {B2B_REQUEST_NAMESPACE, B2B_REQUEST_TAG} from '~/data/b2b-request.js';
import {B2B_REQUEST_SUBMIT_MUTATION} from '~/graphql/b2b/b2bRequest.js';
import {
  CUSTOMER_COMPANY_QUERY,
  customerCompanyVariables,
} from '~/graphql/customer-account/CustomerCompanyQuery.js';
import {buildB2BRequest} from '~/lib/b2b-request.js';

/**
 * Guarda una solicitud de acceso mayorista.
 *
 * El alta de la company **no pasa por acá**: esto solo deja el pedido escrito
 * sobre el cliente para que alguien lo apruebe. Crear la company al pedirla
 * sería regalar el portal — el login es sin contraseña, así que cualquiera con
 * un email llega hasta este endpoint.
 *
 * Es idempotente por construcción: `metafieldsSet` pisa las mismas keys y
 * `tagsAdd` sobre un tag que ya está no hace nada. Reenviar el formulario
 * corrige la solicitud, no crea una segunda.
 *
 * @param {ActionFunctionArgs}
 */
export async function action({request, context}) {
  if (request.method !== 'POST') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  // El gate ya exige sesión para llegar hasta acá, pero el ID del cliente hay
  // que ir a buscarlo igual: es el dueño de los metafields que se escriben.
  const {data, errors: customerErrors} = await context.customerAccount.query(
    CUSTOMER_COMPANY_QUERY,
    {variables: customerCompanyVariables()},
  );

  const customerId = data?.customer?.id;

  if (customerErrors?.length || !customerId) {
    return json({error: 'Unauthorized'}, {status: 401});
  }

  // Con company ya asignada la solicitud no describe nada, y aceptarla dejaría
  // un tag de "pendiente" sobre un cliente activo.
  if (data?.customer?.companyContacts?.edges?.length) {
    return json({error: 'AlreadyApproved'}, {status: 409});
  }

  // Normalmente llega JSON desde el fetcher. Se acepta también un envío de
  // formulario clásico para que un `<form>` sin JS no reciba un 400 que no
  // explica nada — el error real sería "acá hacía falta JavaScript".
  let body;
  try {
    body = request.headers.get('Content-Type')?.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch (error) {
    return json({error: 'Invalid body'}, {status: 400});
  }

  // El reloj se lee acá y no adentro de `buildB2BRequest`, para que esa función
  // sea determinística y se pueda verificar sin simular el tiempo.
  const {metafields, errors} = buildB2BRequest(body, new Date().toISOString());

  if (errors) {
    return json({errors}, {status: 422});
  }

  try {
    const response = await context.adminApiClient.request(
      B2B_REQUEST_SUBMIT_MUTATION,
      {
        variables: {
          customerId,
          tags: [B2B_REQUEST_TAG],
          metafields: metafields.map((metafield) => ({
            ...metafield,
            ownerId: customerId,
          })),
        },
      },
    );

    // La Admin API responde 200 con `errors` en el cuerpo — mismo patrón que
    // `api.draft-order.create.jsx`. Sin esto el endpoint devuelve 200 y el
    // formulario dice "listo" sobre una solicitud que no se guardó.
    if (response?.errors) {
      const status = response.errors.networkStatusCode ?? 502;
      return json({errors: response.errors}, {status});
    }

    const userErrors = [
      ...(response?.data?.metafieldsSet?.userErrors ?? []),
      ...(response?.data?.tagsAdd?.userErrors ?? []),
    ];

    if (userErrors.length) {
      return json({errors: userErrors}, {status: 422});
    }

    // Sin metafields escritos no hay solicitud, por limpia que venga la
    // respuesta. Pasa, por ejemplo, si el token no tiene `write_customers`.
    if (!response?.data?.metafieldsSet?.metafields?.length) {
      return json({error: 'Shopify no guardó la solicitud'}, {status: 502});
    }

    return json({ok: true, namespace: B2B_REQUEST_NAMESPACE});
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('b2bRequestSubmit:', error);
    return json({error: error.message}, {status: 500});
  }
}

/** @typedef {import('@shopify/remix-oxygen').ActionFunctionArgs} ActionFunctionArgs */
