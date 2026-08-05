import {CUSTOMER_COMPANY_QUERY} from '~/graphql/customer-account/CustomerCompanyQuery.js';

/**
 * Contexto B2B del cliente logueado: company y locations.
 *
 * Devuelve `null` en todos los caminos donde no hay nada que mostrar —
 * visitante anónimo, tienda sin B2B habilitado, cliente que no es contacto de
 * ninguna company— para que la UI no tenga que distinguir entre "todavía no
 * cargó", "falló" y "no aplica". Nunca lanza: si B2B está apagado la query
 * devuelve errores y eso NO puede tumbar el storefront entero.
 *
 * @param {import('@shopify/remix-oxygen').AppLoadContext} context
 */
export async function getB2BContext(context) {
  const {customerAccount} = context;

  try {
    const loggedIn = await customerAccount.isLoggedIn();
    if (!loggedIn) return null;

    const {data, errors} = await customerAccount.query(CUSTOMER_COMPANY_QUERY);

    if (errors?.length) return null;

    const company =
      data?.customer?.companyContacts?.edges?.[0]?.node?.company ?? null;

    if (!company) return null;

    const locations = (company.locations?.edges ?? [])
      .map((edge) => edge?.node)
      .filter(Boolean);

    return {
      companyId: company.id,
      companyName: company.name,
      locations,
      // Con una sola location no hay nada que elegir: se selecciona sola.
      activeLocationId: locations.length === 1 ? locations[0].id : null,
    };
  } catch (error) {
    // B2B apagado, permisos faltantes o API caída: la tienda sigue andando.
    return null;
  }
}
