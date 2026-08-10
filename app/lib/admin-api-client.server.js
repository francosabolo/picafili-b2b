import {createAdminApiClient} from '@shopify/admin-api-client';

// El cliente se construye en el PRIMER request, no al armar el contexto.
// `createAdminApiClient` valida las credenciales al construirse y lanza
// `Admin API Client: an access token must be provided` si falta el token. Como
// esto se arma en `createAppLoadContext` —que corre en cada request—, hacerlo
// de entrada volteaba el sitio ENTERO cuando el token no estaba cargado: la
// home tiraba el error generico igual que las cotizaciones, que son las unicas
// que usan la Admin API. Difiriendolo, la falla queda donde corresponde.
export function adminApiClient(env) {
  let apiClient;

  function getApiClient() {
    if (!apiClient) {
      apiClient = createAdminApiClient({
        storeDomain: env?.PUBLIC_STORE_DOMAIN,
        // 2025-01 ya no esta soportada: el cliente avisa en cada request.
        apiVersion: '2025-10',
        accessToken: env?.ADMIN_API_ACCESS_TOKEN,
      });
    }

    return apiClient;
  }

  async function request(query, options = {variables: {}}) {
    return await getApiClient().request(query, options);
  }

  return {request};
}
