#!/usr/bin/env node
/**
 * Contrasta lo que la plantilla DECLARA contra lo que la tienda TIENE.
 *
 * ## Por qué existe
 *
 * `check-template-leaks.mjs` corta los datos de tienda que se pueden reconocer
 * leyendo el código: un mail, una URL, un nombre de marca. Pero la mitad más
 * cara de esta clase de bug no se ve así. `'* tag:parent'` es una string
 * cualquiera; `{namespace: 'product', key: 'grouped'}` es un objeto cualquiera.
 * Para saber que **no existen en esta tienda** hay que preguntarle a la tienda.
 *
 * Y no preguntar sale caro, porque Shopify **no protesta**:
 *
 * - Filtrar por un tag que ningún producto tiene devuelve 0 resultados, no un
 *   error. La búsqueda del sitio estuvo muerta y parecía funcionar.
 * - Pedir un metafield que la tienda no define devuelve `null`, no un error.
 *   La ficha muestra una sección vacía o directamente nada.
 * - Pedir un menú por un handle que no existe devuelve `null`, y el componente
 *   cae a su fallback sin avisar.
 *
 * Cada uno de esos se ve, en producción, como "esta parte no anda" — nunca como
 * un error que apunte a la causa.
 *
 * ## Cuándo correrlo
 *
 * Al apuntar el `.env` a una tienda nueva, que es el momento en que estas
 * suposiciones se rompen todas juntas. No va en el gate: necesita red y
 * credenciales, y el gate tiene que poder correr sin tienda.
 *
 *   npm run doctor
 */
import {readFileSync} from 'node:fs';

const API_VERSION = '2024-07';

/* ── Config declarada por la plantilla ─────────────────────────────────────
   Se lee del texto y no con `import` porque estos módulos usan el alias `~`
   de Vite, que Node no resuelve. Un parser mínimo alcanza y evita montar el
   bundler solo para leer tres constantes. */

function readSource(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

/** Metafields que el storefront le pide a la tienda. */
function declaredMetafields() {
  const src = readSource('app/data/metafields.js');
  const block = src.slice(
    src.indexOf('export const allProductMetafields'),
    src.indexOf('export const legacyLightingMetafields'),
  );
  const out = [];
  const re = /key:\s*'([^']+)',\s*\n\s*namespace:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(block))) out.push({key: m[1], namespace: m[2]});
  return out;
}

/**
 * Las keys de metafield de cliente que escribe la solicitud mayorista.
 *
 * Se leen del texto de `app/data/b2b-request.js` por lo mismo que el resto: ese
 * módulo usa el alias `~` y `import` no lo resuelve desde Node.
 */
function declaredB2BRequestKeys() {
  const src = readSource('app/data/b2b-request.js');
  const keys = [];

  const fields = /key:\s*'([^']+)'/g;
  let m;
  while ((m = fields.exec(src))) keys.push(m[1]);

  const requestedAt = /B2B_REQUESTED_AT_KEY = '([^']+)'/.exec(src);
  if (requestedAt) keys.push(requestedAt[1]);

  return [...new Set(keys)];
}

/**
 * Valor literal de una constante de `const.js`, como texto.
 *
 * El `^` con flag `m` no es decorativo: `const.js` documenta varias constantes
 * mostrando un ejemplo de cómo se encienden, y esos ejemplos son bloques
 * `export const X = {…}` dentro de un comentario JSDoc. Sin anclar al principio
 * de línea, el primer match es el ejemplo comentado — que fue exactamente el
 * primer falso positivo de este script: reportaba el tag "parent" como
 * configurado cuando `PARENT_PRODUCT_FILTER` estaba en `null`, porque leía el
 * ejemplo de arriba.
 */
function constValue(name) {
  const src = readSource('app/lib/const.js');
  const m = new RegExp(`^export const ${name} = ([^;]+);`, 'sm').exec(src);
  return m ? m[1].trim() : null;
}

/* ── Cliente ───────────────────────────────────────────────────────────── */

function env() {
  const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const out = {};
  for (const line of raw.split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

async function query(vars, document, variables = {}) {
  const res = await fetch(
    `https://${vars.PUBLIC_STORE_DOMAIN}/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': vars.PUBLIC_STOREFRONT_API_TOKEN,
      },
      body: JSON.stringify({query: document, variables}),
    },
  );
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
}

/**
 * Admin API. Existe aparte de `query()` porque las **companies** de B2B no se
 * ven desde Storefront: ese schema solo expone la company del cliente que está
 * logueado, y el doctor corre sin sesión de nadie.
 */
async function adminQuery(vars, document) {
  const token = vars.ADMIN_API_ACCESS_TOKEN;

  if (!token) throw new Error('falta ADMIN_API_ACCESS_TOKEN en el .env');

  const res = await fetch(
    `https://${vars.PUBLIC_STORE_DOMAIN}/admin/api/2025-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query: document}),
    },
  );

  const json = await res.json();

  // La Admin API contesta 200 con `errors` como string cuando el token no
  // sirve, y como array cuando el problema es la query.
  if (typeof json.errors === 'string') throw new Error(json.errors);
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  return json.data;
}

/* ── Reporte ───────────────────────────────────────────────────────────── */

const results = [];
const ok = (what, detail) => results.push({level: 'ok', what, detail});
const warn = (what, detail, fix) =>
  results.push({level: 'warn', what, detail, fix});
const bad = (what, detail, fix) =>
  results.push({level: 'bad', what, detail, fix});

async function main() {
  const vars = env();

  const REQUIRED = [
    'PUBLIC_STORE_DOMAIN',
    'PUBLIC_STOREFRONT_API_TOKEN',
    'PUBLIC_STOREFRONT_ID',
    'PUBLIC_CHECKOUT_DOMAIN',
    'PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID',
    'PUBLIC_CUSTOMER_ACCOUNT_API_URL',
    'SHOP_ID',
    'SESSION_SECRET',
    // Sin esta el sitio ENTERO tira 500 en local, no solo las cotizaciones:
    // createAdminApiClient lanza dentro de createAppLoadContext, que corre en
    // cada request.
    'ADMIN_API_ACCESS_TOKEN',
  ];

  const missing = REQUIRED.filter((name) => !vars[name]);
  if (missing.length) {
    bad(
      'Variables de entorno',
      `faltan: ${missing.join(', ')}`,
      'ver .env.example y las env vars de Oxygen',
    );
    // Sin dominio ni token no hay nada más que preguntar.
    if (!vars.PUBLIC_STORE_DOMAIN || !vars.PUBLIC_STOREFRONT_API_TOKEN) {
      return report();
    }
  } else {
    ok('Variables de entorno', `las ${REQUIRED.length} requeridas están`);
  }

  // ── Tienda ───────────────────────────────────────────────────────────
  const shop = await query(
    vars,
    `{ shop { name description primaryDomain { url } paymentSettings { currencyCode countryCode } } }`,
  );

  ok('Tienda', `${shop.shop.name} — ${shop.shop.primaryDomain.url}`);

  if (!shop.shop.description) {
    warn(
      'Descripción de la tienda',
      'vacía en Shopify',
      'la home y el pie caen al texto de i18n; cargala en Configuración → Datos de la tienda',
    );
  }

  const declaredCurrency = constValue('STORE_CURRENCY')?.replace(/'/g, '');
  const realCurrency = shop.shop.paymentSettings.currencyCode;
  if (declaredCurrency !== realCurrency) {
    bad(
      'Moneda',
      `const.js dice ${declaredCurrency} y la tienda cobra en ${realCurrency}`,
      'los importes se muestran en una moneda y el checkout cobra en otra',
    );
  } else {
    ok('Moneda', realCurrency);
  }

  const declaredCountry = constValue('STORE_COUNTRY')?.replace(/'/g, '');
  const realCountry = shop.shop.paymentSettings.countryCode;
  if (declaredCountry !== realCountry) {
    warn(
      'País',
      `const.js dice ${declaredCountry} y la tienda es ${realCountry}`,
      'STORE_COUNTRY va como @inContext(country:) en todas las queries',
    );
  } else {
    ok('País', realCountry);
  }

  // ── Menús ────────────────────────────────────────────────────────────
  for (const handle of ['header-menu', 'footer', 'collections-menu']) {
    const data = await query(
      vars,
      `query M($h: String!) { menu(handle: $h) { items { id } } }`,
      {h: handle},
    );
    if (!data.menu) {
      warn(
        `Menú "${handle}"`,
        'no existe en la tienda',
        'Shopify devuelve null sin error y el componente cae a su fallback',
      );
    } else {
      ok(`Menú "${handle}"`, `${data.menu.items.length} ítems`);
    }
  }

  // ── Metafields declarados ────────────────────────────────────────────
  const identifiers = declaredMetafields();
  if (!identifiers.length) {
    warn('Metafields', 'la plantilla no declara ninguno', null);
  } else {
    const data = await query(
      vars,
      `query MF($ids: [HasMetafieldsIdentifier!]!) {
        products(first: 100) { nodes { metafields(identifiers: $ids) { namespace key } } }
      }`,
      {ids: identifiers},
    );

    const seen = new Set();
    for (const node of data.products.nodes) {
      for (const mf of node.metafields) {
        if (mf) seen.add(`${mf.namespace}.${mf.key}`);
      }
    }

    for (const {namespace, key} of identifiers) {
      const id = `${namespace}.${key}`;
      if (seen.has(id)) {
        ok(`Metafield ${id}`, 'con datos');
      } else {
        warn(
          `Metafield ${id}`,
          'ningún producto de los primeros 100 lo tiene',
          'la query devuelve null en silencio: la ficha no muestra nada',
        );
      }
    }
  }

  // ── Modelo padre/hijo ────────────────────────────────────────────────
  const parentFilter = constValue('PARENT_PRODUCT_FILTER');
  if (parentFilter && parentFilter !== 'null') {
    const tag = /searchTag:\s*'([^']+)'/.exec(parentFilter)?.[1];
    if (tag) {
      const data = await query(
        vars,
        `query T($q: String!) { products(first: 1, query: $q) { nodes { id } } }`,
        {q: `tag:${tag}`},
      );
      if (!data.products.nodes.length) {
        bad(
          `Tag "${tag}"`,
          'ningún producto lo tiene',
          'PARENT_PRODUCT_FILTER.searchTag deja la búsqueda en CERO resultados',
        );
      } else {
        ok(`Tag "${tag}"`, 'hay productos');
      }
    }
  } else {
    ok('Modelo padre/hijo', 'apagado (PARENT_PRODUCT_FILTER = null)');
  }

  // ── Fuente de la categoría (descuentos por categoría) ─────────────────
  const source = constValue('CATEGORY_KEY_SOURCE')?.replace(/'/g, '');
  const cat = await query(
    vars,
    `{ products(first: 100) { nodes { productType collections(first: 1) { nodes { handle } } } } }`,
  );
  const withType = cat.products.nodes.filter((p) => p.productType).length;
  const withCollection = cat.products.nodes.filter(
    (p) => p.collections.nodes.length,
  ).length;

  if (source === 'productType' && withType === 0) {
    bad(
      'CATEGORY_KEY_SOURCE',
      `dice "productType" y 0 de ${cat.products.nodes.length} productos lo tienen`,
      'ningún descuento por categoría se va a aplicar',
    );
  } else if (source === 'collection' && withCollection === 0) {
    bad(
      'CATEGORY_KEY_SOURCE',
      'dice "collection" y ningún producto está en una colección',
      'ningún descuento por categoría se va a aplicar',
    );
  } else {
    ok(
      'CATEGORY_KEY_SOURCE',
      `"${source}" — ${
        source === 'productType' ? withType : withCollection
      } de ${cat.products.nodes.length} productos lo tienen`,
    );
  }

  // ── Catálogos B2B ────────────────────────────────────────────────────
  const b2b = await query(
    vars,
    `{ products(first: 50) { nodes { variants(first: 5) { nodes {
        quantityPriceBreaks(first: 1) { nodes { minimumQuantity } }
        quantityRule { minimum increment }
    } } } } }`,
  ).catch((error) => ({error}));

  if (b2b.error) {
    warn('Catálogos B2B', `no se pudo consultar: ${b2b.error.message}`, null);
  } else {
    let breaks = 0;
    let rules = 0;
    for (const p of b2b.products.nodes) {
      for (const v of p.variants.nodes) {
        if (v.quantityPriceBreaks?.nodes?.length) breaks += 1;
        if (v.quantityRule?.minimum > 1 || v.quantityRule?.increment > 1) {
          rules += 1;
        }
      }
    }
    if (!breaks && !rules) {
      warn(
        'Catálogos B2B',
        'sin quiebres por cantidad ni reglas configuradas',
        'E4 y E5 no renderizan nada — es correcto, pero la demo no los muestra',
      );
    } else {
      ok(
        'Catálogos B2B',
        `${breaks} variantes con quiebres, ${rules} con reglas`,
      );
    }
  }

  // ── Portal cerrado: ¿hay alguien que pueda entrar? ────────────────────
  //
  // Este chequeo es el más importante del script, porque el modo de falla que
  // cubre no se parece a un error: con `REQUIRE_B2B_COMPANY` encendido y cero
  // companies cargadas, el sitio compila, deploya, responde 200 y **manda a
  // todo el mundo a "cuenta en revisión"**, incluida la demo. No hay pantalla
  // de error que mirar ni log que leer: parece que el portal está en orden y
  // que nadie tiene permiso.
  const requiresCompany = constValue('REQUIRE_B2B_COMPANY') === 'true';
  const cartOff = constValue('ENABLE_CART') === 'false';

  // Una sola consulta alimenta los dos chequeos: quién puede entrar y por dónde
  // puede pagar. Las locations vienen en la misma ida porque es de ellas —y no
  // de la company— de donde cuelgan tanto los precios como el checkout.
  const companies =
    requiresCompany || cartOff
      ? await adminQuery(
          vars,
          `{ companies(first: 50) { nodes {
               id name
               locations(first: 20) { nodes {
                 id name
                 buyerExperienceConfiguration { checkoutToDraft }
               } }
             } } }`,
        ).catch((error) => ({error}))
      : null;

  const companyNodes = companies?.companies?.nodes ?? [];

  if (requiresCompany) {
    if (companies.error) {
      warn(
        'Companies B2B',
        `no se pudo verificar: ${companies.error.message}`,
        'REQUIRE_B2B_COMPANY está en true y esto NO quedó comprobado — sin companies, nadie entra al portal',
      );
    } else if (!companyNodes.length) {
      bad(
        'Companies B2B',
        'REQUIRE_B2B_COMPANY está en true y la tienda no tiene ninguna company',
        'nadie puede pasar del login: cargá companies en Shopify o poné REQUIRE_B2B_COMPANY en false',
      );
    } else {
      ok(
        'Companies B2B',
        `${companyNodes.length} company(s) — el portal tiene a quién dejar entrar`,
      );
    }
  }

  // ── ¿El "solo draft orders" vale fuera de este repo? ──────────────────
  //
  // `ENABLE_CART = false` apaga el carrito **de este storefront**, y nada más.
  // El mismo comprador puede entrar al theme de Liquid, ver los precios de su
  // company y pagar ahí, salteándose la revisión comercial entera. Lo que sí lo
  // cierra es `checkoutToDraft` en la company location: con eso el checkout
  // termina en un draft order para revisión **venga de donde venga**.
  //
  // Es un desvío que no avisa. La location queda creada, el portal anda, el
  // theme anda, y el día que alguien compre por el otro lado se entera quien
  // factura. Por eso se reporta como problema y no como aviso: el código dice
  // una cosa y la tienda hace otra.
  if (cartOff && companies?.error) {
    // Sin este aviso, un token sin permisos hacía que el chequeo se salteara
    // en silencio — y "no salió nada" se lee igual que "está todo bien".
    warn(
      'Checkout a draft (checkoutToDraft)',
      `no se pudo verificar: ${companies.error.message}`,
      'ENABLE_CART está en false pero NO quedó comprobado que el theme no pueda cobrarle a un cliente B2B',
    );
  }

  if (cartOff && companies && !companies.error && companyNodes.length) {
    const open = [];

    for (const company of companyNodes) {
      for (const location of company.locations?.nodes ?? []) {
        if (location?.buyerExperienceConfiguration?.checkoutToDraft !== true) {
          open.push(`${company.name} / ${location?.name ?? location?.id}`);
        }
      }
    }

    if (open.length) {
      bad(
        'Checkout a draft (checkoutToDraft)',
        `${
          open.length
        } location(s) pueden pagar directo salteando la revisión: ${open
          .slice(0, 5)
          .join(', ')}${open.length > 5 ? '…' : ''}`,
        'Clientes → Empresas → [empresa] → Ubicaciones → [ubicación] → Envío de pedidos → "Enviar todos los pedidos como borradores para revisión"',
      );
    } else {
      ok(
        'Checkout a draft (checkoutToDraft)',
        'todas las locations envían sus pedidos a revisión',
      );
    }
  }

  // ── Definiciones de la solicitud mayorista ───────────────────────────
  //
  // `metafieldsSet` guarda un metafield **sin definición** y devuelve éxito.
  // El admin de Shopify, en cambio, solo muestra los que tienen definición. Sin
  // ellas la solicitud se guarda perfecto y quien tiene que aprobarla abre la
  // ficha del cliente y no ve nada — ningún error, ninguna pista.
  const requestKeys = declaredB2BRequestKeys();

  if (requestKeys.length) {
    const defs = await adminQuery(
      vars,
      `{ metafieldDefinitions(first: 50, ownerType: CUSTOMER, namespace: "b2b") {
           nodes { key }
         } }`,
    ).catch((error) => ({error}));

    if (defs.error) {
      warn(
        'Solicitud mayorista (metafields)',
        `no se pudo verificar: ${defs.error.message}`,
        'sin definiciones en el admin, las solicitudes se guardan y NO se ven',
      );
    } else {
      const present = new Set(
        (defs.metafieldDefinitions?.nodes ?? []).map((n) => n.key),
      );
      const missing = requestKeys.filter((key) => !present.has(key));

      if (missing.length) {
        bad(
          'Solicitud mayorista (metafields)',
          `faltan ${missing.length} de ${
            requestKeys.length
          } definiciones: ${missing.join(', ')}`,
          'creálas en Configuración → Datos personalizados → Clientes, namespace "b2b", tipo texto de una línea',
        );
      } else {
        ok(
          'Solicitud mayorista (metafields)',
          `las ${requestKeys.length} definiciones están en el admin`,
        );
      }
    }
  }

  // ── Scope de inventario ──────────────────────────────────────────────
  const inventory = await query(
    vars,
    `{ products(first: 1) { nodes { variants(first: 1) { nodes { quantityAvailable } } } } }`,
  ).catch((error) => ({error}));

  if (inventory.error) {
    warn(
      'Stock real (quantityAvailable)',
      inventory.error.message,
      'falta el scope unauthenticated_read_product_inventory en el token',
    );
  } else {
    ok('Stock real (quantityAvailable)', 'el token tiene el scope');
  }

  report();
}

function report() {
  const icon = {ok: '✓', warn: '!', bad: '✗'};
  const color = {ok: '\x1b[32m', warn: '\x1b[33m', bad: '\x1b[31m'};

  console.log('');
  for (const r of results) {
    console.log(
      `${color[r.level]}${icon[r.level]}\x1b[0m ${r.what}: ${r.detail}`,
    );
    if (r.fix) console.log(`    → ${r.fix}`);
  }

  const bads = results.filter((r) => r.level === 'bad').length;
  const warns = results.filter((r) => r.level === 'warn').length;
  console.log('');
  console.log(
    bads
      ? `\x1b[31m✗ ${bads} problema(s) y ${warns} aviso(s).\x1b[0m`
      : `\x1b[32m✓ Sin problemas.\x1b[0m ${warns} aviso(s).`,
  );

  // Los avisos no cortan: una tienda sin catálogos B2B es una tienda válida.
  process.exit(bads ? 1 : 0);
}

main().catch((error) => {
  console.error(
    `\n\x1b[31m✗ El doctor no pudo terminar:\x1b[0m ${error.message}`,
  );
  process.exit(1);
});
