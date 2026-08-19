#!/usr/bin/env node
/**
 * Carga el **precio de retail** como `compareAtPrice` del catálogo mayorista,
 * para que el portal pueda mostrar cuánto ahorra el comprador contra el precio
 * público.
 *
 * ## Por qué existe
 *
 * El storefront ya muestra precio tachado y porcentaje de ahorro, pero eso sale
 * de `compareAtPrice`, y sin este paso ese campo trae **el compare-at propio
 * del producto** — una oferta de retail, no la ventaja mayorista. El resultado
 * se ve bien y dice otra cosa: porcentajes distintos en cada producto que no
 * tienen nada que ver con el acuerdo.
 *
 * Una price list tiene su propio `compareAtPrice` (`PriceListPrice`). Cargándolo
 * con el precio de retail de cada variante, el tachado pasa a ser el precio
 * público de verdad — y viaja también al checkout, sin tocar una línea de
 * código del storefront.
 *
 *   npm run precios:compare-at            # muestra qué haría, no escribe
 *   npm run precios:compare-at -- --write # lo aplica
 *
 * Necesita `ADMIN_API_ACCESS_TOKEN` con `read_products`/`write_products` y
 * permiso de catálogos.
 *
 * ## Es seguro correrlo dos veces
 *
 * Solo toca las variantes cuyo `compareAtPrice` no coincide con el retail
 * actual. Y **nunca toca un precio calculado por porcentaje**: escribirle un
 * precio fijo lo congelaría, y a partir de ahí un cambio en el precio base
 * dejaría de reflejarse en el catálogo. Si encuentra precios así, los reporta y
 * no los pisa — ver la nota al final de la salida.
 *
 * ## Qué NO hace
 *
 * No mantiene nada solo: si mañana cambia un precio de retail, el compare-at
 * del catálogo queda viejo hasta que alguien vuelva a correr esto. Es el costo
 * de la vía nativa; la alternativa (pedirle a Shopify el precio de retail en
 * cada request) no llega al checkout.
 */
import {readFileSync} from 'node:fs';

const API_VERSION = '2025-01';

function env() {
  const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const out = {};
  for (const line of raw.split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

async function admin(vars, document, variables = {}) {
  const res = await fetch(
    `https://${vars.PUBLIC_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': vars.ADMIN_API_ACCESS_TOKEN,
      },
      body: JSON.stringify({query: document, variables}),
    },
  );

  const json = await res.json();

  if (typeof json.errors === 'string') throw new Error(json.errors);
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  return json.data;
}

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

/** Los catálogos de company location con su price list. */
const CATALOGS_QUERY = `#graphql
  query CatalogsB2B {
    catalogs(first: 20, type: COMPANY_LOCATION) {
      nodes {
        id
        title
        status
        ... on CompanyLocationCatalog {
          priceList { id name currency }
        }
      }
    }
  }
`;

/**
 * Los precios de la lista, con el precio de retail de cada variante al lado.
 *
 * `originType` es lo que distingue un precio escrito a mano de uno calculado
 * por porcentaje, y es la razón por la que este script puede ser prudente.
 */
const PRICES_QUERY = `#graphql
  query PriceListPrices($id: ID!, $after: String) {
    priceList(id: $id) {
      prices(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          originType
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          variant {
            id
            title
            price
            compareAtPrice
            product { title }
          }
        }
      }
    }
  }
`;

const WRITE_MUTATION = `#graphql
  mutation PriceListFixedPricesAdd($priceListId: ID!, $prices: [PriceListPriceInput!]!) {
    priceListFixedPricesAdd(priceListId: $priceListId, prices: $prices) {
      prices { compareAtPrice { amount } }
      userErrors { field message code }
    }
  }
`;

async function allPrices(vars, priceListId) {
  const out = [];
  let after = null;

  do {
    const data = await admin(vars, PRICES_QUERY, {id: priceListId, after});
    const page = data?.priceList?.prices;
    if (!page) break;
    out.push(...(page.nodes ?? []));
    after = page.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  return out;
}

/** Dos importes son el mismo si coinciden hasta el centavo. */
function sameAmount(a, b) {
  if (a == null || b == null) return false;
  return Math.round(Number(a) * 100) === Math.round(Number(b) * 100);
}

async function main() {
  const write = process.argv.includes('--write');
  const vars = env();

  if (!vars.ADMIN_API_ACCESS_TOKEN || !vars.PUBLIC_STORE_DOMAIN) {
    throw new Error(
      'faltan ADMIN_API_ACCESS_TOKEN o PUBLIC_STORE_DOMAIN en el .env',
    );
  }

  console.log(`\nCatálogos B2B de ${vars.PUBLIC_STORE_DOMAIN}`);
  if (!write) {
    console.log(
      `${DIM}Modo lectura: no escribe nada. Agregá --write para aplicar.${OFF}`,
    );
  }

  const {catalogs} = await admin(vars, CATALOGS_QUERY);
  const list = (catalogs?.nodes ?? []).filter((c) => c.priceList?.id);

  if (!list.length) {
    console.log(
      `${YELLOW}No hay catálogos de company location con price list.${OFF}`,
    );
    console.log(
      'Sin catálogo no hay precio mayorista que comparar: primero hay que crearlo.\n',
    );
    return;
  }

  let pending = 0;
  let relative = 0;
  let applied = 0;

  for (const catalog of list) {
    const prices = await allPrices(vars, catalog.priceList.id);

    console.log(
      `\n${catalog.title} ${DIM}(${catalog.status}, ${prices.length} variantes)${OFF}`,
    );

    // Precio calculado por porcentaje: escribirle un precio fijo lo congela.
    const calculated = prices.filter((p) => p.originType !== 'FIXED');
    relative += calculated.length;

    const changes = [];

    for (const entry of prices) {
      if (entry.originType !== 'FIXED') continue;

      const retail = entry.variant?.price;
      if (!retail) continue;

      // El compare-at que ya tiene la lista. Si ya es el retail, no hay nada
      // que hacer: correr esto de nuevo no tiene que producir escrituras.
      if (sameAmount(entry.compareAtPrice?.amount, retail)) continue;

      // Un "ahorro" negativo o nulo no se anuncia: si el precio de la lista no
      // es menor al de retail, tachar el retail sería mentir al revés.
      if (Number(entry.price.amount) >= Number(retail)) continue;

      changes.push({
        variantId: entry.variant.id,
        price: {
          amount: entry.price.amount,
          currencyCode: entry.price.currencyCode,
        },
        compareAtPrice: {
          amount: retail,
          currencyCode: entry.price.currencyCode,
        },
        label: `${entry.variant.product?.title ?? ''} ${
          entry.variant.title ?? ''
        }`.trim(),
      });
    }

    pending += changes.length;

    for (const change of changes.slice(0, 5)) {
      console.log(
        `  ${change.label} ${DIM}→ tachado ${change.compareAtPrice.amount}${OFF}`,
      );
    }
    if (changes.length > 5) {
      console.log(`  ${DIM}… y ${changes.length - 5} más${OFF}`);
    }
    if (!changes.length) {
      console.log(`  ${GREEN}Nada que cambiar.${OFF}`);
    }

    if (calculated.length) {
      console.log(
        `  ${YELLOW}${calculated.length} precio(s) calculados por porcentaje: no se tocan.${OFF}`,
      );
    }

    if (write && changes.length) {
      // De a 100, que es el máximo por llamada.
      for (let i = 0; i < changes.length; i += 100) {
        const batch = changes
          .slice(i, i + 100)
          .map(({label, ...price}) => price);

        const result = await admin(vars, WRITE_MUTATION, {
          priceListId: catalog.priceList.id,
          prices: batch,
        });

        const errors = result?.priceListFixedPricesAdd?.userErrors ?? [];
        if (errors.length) {
          console.log(
            `  ${RED}Shopify rechazó ${errors.length}:${OFF} ${errors[0].message}`,
          );
        }

        applied += batch.length - errors.length;
      }
    }
  }

  console.log('');

  if (!write) {
    console.log(
      pending
        ? `${pending} variante(s) quedarían con el precio de retail tachado. Corré con --write para aplicarlo.`
        : `${GREEN}Todo al día.${OFF}`,
    );
  } else {
    console.log(`${GREEN}${applied} variante(s) actualizadas.${OFF}`);
  }

  if (relative) {
    console.log(
      `\n${YELLOW}Ojo:${OFF} ${relative} precio(s) del catálogo salen de un ajuste por porcentaje.\n` +
        'Ahí Shopify calcula el precio desde el de retail, así que el compare-at\n' +
        'suele venir bien solo — y escribir un precio fijo encima lo congelaría:\n' +
        'un cambio de precio en el producto dejaría de reflejarse en el catálogo.\n' +
        'Si en el portal no ves el tachado en esos productos, revisá el catálogo\n' +
        'en el admin antes de forzar nada.',
    );
  }

  console.log('');
}

main().catch((error) => {
  console.error(`\n${RED}✗ No se pudo actualizar:${OFF} ${error.message}`);

  if (/access|scope|denied|catalog|permission/i.test(error.message)) {
    console.error(
      '\nEl token necesita `read_products` y `write_products`, y permiso de\n' +
        'catálogos. Se agrega en el admin: Configuración → Apps y canales de\n' +
        'venta → Desarrollar apps → [la app] → Configuración → Admin API.\n',
    );
  }

  process.exit(1);
});
