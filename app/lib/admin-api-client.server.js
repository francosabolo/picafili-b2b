import {createAdminApiClient} from '@shopify/admin-api-client';

export async function adminApiClient(env) {
  const apiClient = createAdminApiClient({
    storeDomain: env?.PUBLIC_STORE_DOMAIN,
    // 2025-01 ya no esta soportada: el cliente avisa en cada request.
    apiVersion: '2025-10',
    accessToken: env?.ADMIN_API_ACCESS_TOKEN,
  });

  async function request(query, options = {variables: {}}) {
    return await apiClient.request(query, options);
  }

  return {request};
}
