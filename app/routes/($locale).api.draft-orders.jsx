import {json} from '@shopify/remix-oxygen';

export async function action({request, context}) {
  // `createAppLoadContext` lo expone como `adminApiClient`; el nombre viejo
  // no existía y este endpoint tiraba 500 en cada llamada.
  const response = await context.adminApiClient.request(
    `#graphql
        query {
        draftOrders(first: 10) {
            edges {
                node {
                    id
                }
            }
        }
    }`,
  );

  return json(response);
}
