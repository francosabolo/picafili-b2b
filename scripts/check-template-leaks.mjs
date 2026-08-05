#!/usr/bin/env node
/**
 * Impide que datos de UNA tienda vuelvan a entrar escritos a mano en el código.
 *
 * ## Por qué existe
 *
 * Este repo es una plantilla: apuntar el `.env` a otra tienda de Shopify tiene
 * que alcanzar. El fork del que viene dejó su tienda escrita a mano por todos
 * lados, y la clase entera de bug comparte una propiedad incómoda: **ninguno
 * falla ruidosamente**. Los encontrados hasta hoy:
 *
 * - `searchTerm + '* tag:parent'` → la búsqueda del sitio devolvía **cero
 *   resultados para cualquier palabra**. No tiraba error: mostraba "sin
 *   resultados", que es lo que uno espera de una búsqueda sin coincidencias.
 * - `productMetafield: {namespace: 'product', key: 'grouped'}` → no-op de
 *   casualidad acá; en una tienda que defina ese metafield, esconde productos.
 * - `'hola@picafili.com.ar'` dentro de `Footer.jsx`.
 * - `PowerB2X | Cart` en el `<title>` de 10 rutas, en inglés.
 * - `https://powerb2x.com/` como "Home" del menú de emergencia — sacaba al
 *   comprador de la tienda del cliente.
 * - Un `'€'` hardcodeado en `ProductPrice`, con la tienda en pesos.
 *
 * El gate no los podía atrapar: son **datos válidos, solo que de otra tienda**.
 * El build compila, el lint pasa, los tipos cierran. Este chequeo mira lo único
 * que los delata — que sean literales.
 *
 * ## Qué hace
 *
 * Corre sobre las **líneas nuevas** (igual que el lint y las escalas de
 * diseño): la deuda vieja no bloquea, pero nada nuevo entra. Si necesitás una
 * excepción legítima, `template-leak-ok` en la misma línea.
 */
import {execSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {commentLines} from './lib/comment-lines.mjs';

/**
 * Dónde SÍ puede vivir un dato de tienda.
 *
 * `const.js` es el bloque de configuración (AGENTS.md), los diccionarios son
 * textos de UI, y `scripts/` y `docs/` hablan del problema en vez de tenerlo.
 */
const ALLOWED_PATHS = [
  'app/lib/const.js',
  'app/i18n/translations/',
  'scripts/',
  'docs/',
];

/**
 * Hosts que no son "de la tienda": infraestructura y esquemas.
 *
 * `schema.org` y `www.w3.org` aparecen en atributos de SVG y JSON-LD; los CDN
 * de Shopify y las fuentes son de la plataforma, no del cliente.
 */
const ALLOWED_HOSTS = [
  'schema.org',
  'www.w3.org',
  'cdn.shopify.com',
  'shopify.com',
  'shopify.dev',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'localhost',
];

/**
 * Marcas que ya se filtraron y no deben volver.
 *
 * Es una lista explícita y no una heurística: adivinar qué palabra es una marca
 * genera falsos positivos, y un chequeo que grita de más se termina apagando.
 * Al instalar la plantilla en un cliente nuevo, sumá su nombre acá — así el
 * siguiente que la copie no hereda los datos de este.
 */
const BRAND_WORDS = ['picafili', 'powerb2x', 'herlighting'];

const RULES = [
  {
    id: 'email',
    test: /[\w.+-]+@[\w-]+\.[\w.]{2,}/,
    hint: 'un email es dato de tienda: va en SALES_CONTACT (app/lib/const.js)',
  },
  {
    id: 'url',
    test: /https?:\/\/([^\s'"`/]+)/,
    hint: 'una URL absoluta es dato de tienda: va en app/lib/const.js',
    // Se ignora si el host está en ALLOWED_HOSTS.
    hostFrom: /https?:\/\/([^\s'"`/]+)/,
  },
  {
    id: 'brand',
    test: new RegExp(`\\b(${BRAND_WORDS.join('|')})\\b`, 'i'),
    hint: 'el nombre de la tienda sale de Shopify (shop.name), no del código',
  },
];

/** Extensiones que se revisan: donde vive la lógica de la app. */
const GLOBS = ['*.js', '*.jsx'];

function addedLinesByFile() {
  const globs = GLOBS.map((g) => `"${g}"`).join(' ');
  const diff = execSync(`git diff HEAD -U0 -- ${globs}`, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 32,
  });

  const files = new Map();
  let file = null;
  let lineNumber = 0;

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      file = line.slice(6);
      if (!files.has(file)) files.set(file, []);
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) {
      lineNumber = Number(hunk[1]);
      continue;
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      files.get(file)?.push({number: lineNumber, text: line.slice(1)});
      lineNumber += 1;
    }
  }

  const untracked = execSync(
    `git ls-files --others --exclude-standard -- ${globs}`,
    {encoding: 'utf8'},
  )
    .split('\n')
    .filter(Boolean);

  for (const path of untracked) {
    files.set(
      path,
      readFileSync(path, 'utf8')
        .split('\n')
        .map((text, index) => ({number: index + 1, text})),
    );
  }

  return files;
}

/**
 * Saca comentarios antes de evaluar.
 *
 * Los comentarios de este repo nombran marcas y dominios a propósito —
 * explican por qué algo se sacó de ahí. Sin este paso, documentar el bug
 * dispararía el chequeo del bug.
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/, '$1')
    .replace(/^\s*\*.*$/, '');
}

const violations = [];

for (const [file, lines] of addedLinesByFile()) {
  if (ALLOWED_PATHS.some((allowed) => file.startsWith(allowed))) continue;

  const comments = commentLines(file);

  for (const {number, text} of lines) {
    if (text.includes('template-leak-ok')) continue;
    // Mismo motivo que en check-design-tokens: un comentario multilínea que
    // explica por qué se sacó un dominio no puede disparar el chequeo.
    if (comments.has(number)) continue;

    const code = stripComments(text);
    if (!code.trim()) continue;

    for (const rule of RULES) {
      const match = code.match(rule.test);
      if (!match) continue;

      if (rule.hostFrom) {
        const host = code.match(rule.hostFrom)?.[1] ?? '';
        if (
          ALLOWED_HOSTS.some((ok) => host === ok || host.endsWith(`.${ok}`))
        ) {
          continue;
        }
      }

      violations.push({file, number, value: match[0], hint: rule.hint});
      break;
    }
  }
}

if (violations.length) {
  console.error('');
  for (const {file, number, value, hint} of violations) {
    console.error(`${file}:${number}`);
    console.error(`  ${value}  →  ${hint}`);
  }
  console.error(
    `\n✖ ${violations.length} dato(s) de tienda escritos a mano en líneas nuevas.`,
  );
  console.error(
    '  Esto es una plantilla: ver "Esto es una plantilla" en AGENTS.md.',
  );
  console.error(
    '  Si la excepción es legítima, poné `template-leak-ok` en la línea.',
  );
  process.exit(1);
}

console.log('Sin datos de tienda escritos a mano en las líneas nuevas.');
