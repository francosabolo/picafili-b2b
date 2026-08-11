#!/usr/bin/env node
/**
 * Crea en Shopify las definiciones de metafield que necesita la solicitud de
 * acceso mayorista.
 *
 * ## Por qué existe
 *
 * `metafieldsSet` guarda un metafield **sin definición** y devuelve éxito, pero
 * el admin solo muestra los que tienen definición. Sin este paso, una solicitud
 * se guarda perfecta y quien tiene que aprobarla abre la ficha del cliente y no
 * ve nada — ningún error, ninguna pista. `npm run doctor` lo detecta; esto lo
 * arregla.
 *
 * Hacerlo a mano son nueve formularios en el admin, y de nuevo en cada tienda.
 * Este script lo vuelve un comando, que es lo que esta plantilla promete.
 *
 * ## Es seguro correrlo dos veces
 *
 * Chequea qué existe antes de crear y solo agrega lo que falta. No toca, no
 * pisa y no borra definiciones existentes: si alguien ya creó una a mano con
 * otro nombre, la respeta y la reporta.
 *
 *   npm run setup:b2b
 *
 * Necesita `ADMIN_API_ACCESS_TOKEN` con scope `write_customers` en el `.env`.
 */
import {readFileSync} from 'node:fs';

const API_VERSION = '2025-01';

/* ── Config declarada por la plantilla ───────────────────────────────────── */

function readSource(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

/**
 * Los campos, leídos de la lista canónica y de los diccionarios.
 *
 * El nombre que se ve en el admin sale del **diccionario en castellano**, y no
 * de un literal acá, por la misma razón que el resto del proyecto: si mañana el
 * campo se llama distinto se cambia en un solo lugar. Quien aprueba lee el
 * admin, así que el rótulo tiene que ser el mismo que ve el comprador.
 */
function declaredFields() {
  const src = readSource('app/data/b2b-request.js');
  const dictionary = JSON.parse(readSource('app/i18n/translations/es.json'))[
    'b2b-request'
  ];

  const fields = [];
  const re =
    /name:\s*'([^']+)',\s*\n\s*key:\s*'([^']+)',\s*\n\s*labelKey:\s*'b2b-request\.([^']+)'/g;

  let m;
  while ((m = re.exec(src))) {
    fields.push({key: m[2], name: dictionary?.[m[3]] ?? m[2]});
  }

  const requestedAt = /B2B_REQUESTED_AT_KEY = '([^']+)'/.exec(src);
  if (requestedAt) {
    fields.push({key: requestedAt[1], name: 'Fecha de solicitud'});
  }

  const namespace = /B2B_REQUEST_NAMESPACE = '([^']+)'/.exec(src);

  return {namespace: namespace ? namespace[1] : 'b2b', fields};
}

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

  // La Admin API contesta 200 con `errors` como string cuando el token no
  // sirve, y como array cuando el problema es la query o los permisos.
  if (typeof json.errors === 'string') throw new Error(json.errors);
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  return json.data;
}

/* ── Comando ─────────────────────────────────────────────────────────────── */

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const OFF = '\x1b[0m';

async function main() {
  const vars = env();

  if (!vars.ADMIN_API_ACCESS_TOKEN || !vars.PUBLIC_STORE_DOMAIN) {
    throw new Error(
      'faltan ADMIN_API_ACCESS_TOKEN o PUBLIC_STORE_DOMAIN en el .env',
    );
  }

  const {namespace, fields} = declaredFields();

  console.log(
    `\nSolicitud mayorista → ${fields.length} definiciones en "${namespace}" sobre CLIENTE`,
  );
  console.log(`Tienda: ${vars.PUBLIC_STORE_DOMAIN}\n`);

  const existing = await admin(
    vars,
    `query($namespace: String!) {
      metafieldDefinitions(first: 100, ownerType: CUSTOMER, namespace: $namespace) {
        nodes { key name }
      }
    }`,
    {namespace},
  );

  const present = new Map(
    (existing.metafieldDefinitions?.nodes ?? []).map((n) => [n.key, n.name]),
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const field of fields) {
    if (present.has(field.key)) {
      console.log(
        `${YELLOW}·${OFF} ${field.key.padEnd(16)} ya existe como "${present.get(
          field.key,
        )}"`,
      );
      skipped += 1;
      continue;
    }

    const result = await admin(
      vars,
      `mutation($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition { key }
          userErrors { field message code }
        }
      }`,
      {
        definition: {
          name: field.name,
          namespace,
          key: field.key,
          ownerType: 'CUSTOMER',
          // Texto de una línea para todo, incluida la fecha: el valor lo lee un
          // humano en el admin, no se filtra ni se ordena por él.
          type: 'single_line_text_field',
        },
      },
    ).catch((error) => ({error}));

    const userErrors =
      result?.error ??
      result?.metafieldDefinitionCreate?.userErrors?.[0]?.message;

    if (userErrors) {
      console.log(
        `${RED}✗${OFF} ${field.key.padEnd(16)} ${
          userErrors.message ?? userErrors
        }`,
      );
      failed += 1;
      continue;
    }

    console.log(
      `${GREEN}✓${OFF} ${field.key.padEnd(16)} creada — "${field.name}"`,
    );
    created += 1;
  }

  console.log(
    `\n${created} creada(s), ${skipped} ya estaban, ${failed} con error.`,
  );

  if (failed) {
    console.log(
      `${RED}Quedaron definiciones sin crear:${OFF} las solicitudes se van a guardar y el admin NO las va a mostrar.`,
    );
    process.exit(1);
  }

  console.log('Verificá con `npm run doctor`.\n');
}

main().catch((error) => {
  console.error(`\n${RED}✗ No se pudo configurar:${OFF} ${error.message}`);

  if (/access|scope|denied|password|login/i.test(error.message)) {
    console.error(
      '\nEl token necesita el scope `write_customers`. Se agrega en el admin:\n' +
        'Configuración → Apps y canales de venta → Desarrollar apps → [la app] →\n' +
        'Configuración → Admin API → Editar, y después volver a instalar la app.\n',
    );
  }

  process.exit(1);
});
