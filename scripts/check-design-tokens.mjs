#!/usr/bin/env node
/**
 * Verifica que el SCSS **nuevo** use las escalas de DESIGN.md.
 *
 * Por qué existe: el proyecto acumuló 51 tamaños de fuente, 26 radios y 134
 * valores de espaciado distintos. Nadie decidió eso — se fue juntando eligiendo
 * un valor a ojo por componente. Eso es lo que se percibe como "interfaz
 * frágil": cosas que casi se alinean, textos que casi son del mismo tamaño.
 *
 * Un DESIGN.md solo no arregla nada: se lee una vez y se ignora. Esto lo hace
 * cumplir.
 *
 * Mira SOLO las líneas agregadas, igual que `lint-changed-lines.mjs`: la deuda
 * vieja no bloquea a nadie, pero lo nuevo entra en escala. Se paga por archivo
 * cuando toca modificarlo.
 */
import {execSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {commentLines} from './lib/comment-lines.mjs';

const TEXT = new Set([
  'var(--text-xs)',
  'var(--text-sm)',
  'var(--text-base)',
  'var(--text-lg)',
  'var(--text-xl)',
  'var(--text-2xl)',
  'var(--text-display)',
  'inherit',
  '1em',
]);

const RADII = new Set([
  'var(--radius-sm)',
  'var(--radius-md)',
  'var(--radius-lg)',
  'var(--radius-pill)',
  // Los legacy siguen valiendo: son alias de los de arriba y los usan ~40
  // archivos. Cambia el valor, no el contrato.
  'var(--border-radius)',
  'var(--button-border-radius)',
  'var(--input-border-radius)',
  '0',
  '50%',
  '100%',
]);

const SPACE = new Set([
  'var(--space-1)',
  'var(--space-2)',
  'var(--space-3)',
  'var(--space-4)',
  'var(--space-6)',
  'var(--space-8)',
  'var(--space-12)',
  'var(--space-16)',
  '0',
  'auto',
  'inherit',
]);

/** Archivo donde viven los tokens: ahí los valores crudos son el punto. */
const TOKENS_FILE = 'app/styles/_app.scss';

const RULES = [
  {
    property: 'font-size',
    allowed: TEXT,
    hint: 'usá la escala tipográfica (--text-xs … --text-display)',
  },
  {
    property: 'border-radius',
    allowed: RADII,
    hint: 'usá --radius-sm | --radius-md | --radius-lg | --radius-pill',
  },
  {
    property: 'gap',
    allowed: SPACE,
    hint: 'usá la escala de espaciado (--space-1 … --space-16)',
    // `gap` tambien es shorthand: `gap: <row> <column>`. Sin esto, un
    // `gap: var(--space-1) var(--space-2)` —dos valores los dos en escala— se
    // reportaba como violacion porque se comparaba la cadena entera contra el
    // set. Se valida parte por parte, como padding y margin.
    multi: true,
  },
];

/**
 * `padding` y `margin` se validan parte por parte: son shorthands de hasta
 * cuatro valores y es justo donde se cuelan los numeros magicos —es la
 * categoria mas grande de la deuda, 134 valores distintos.
 */
const SHORTHANDS = ['padding', 'margin'];

/**
 * Un valor suelto de espaciado. Se acepta cualquier `var(--…)`: un token es una
 * decision con nombre, aunque no sea de la escala de espaciado (--header-height
 * es legitimo en un padding-top). Lo que se corta son los numeros crudos.
 *
 * @param {string} part
 */
function isAcceptableSpacing(part) {
  if (SPACE.has(part)) return true;
  if (/^var\(--[\w-]+\)$/.test(part)) return true;
  if (/^(0|auto|inherit|initial|unset)$/.test(part)) return true;
  if (/^-?\d+(\.\d+)?%$/.test(part)) return true;
  if (part.startsWith('calc(')) return true;
  return false;
}

/**
 * Líneas agregadas por archivo, según el diff contra HEAD.
 *
 * @returns {Map<string, Array<{number: number, text: string}>>}
 */
function addedLinesByFile() {
  const diff = execSync('git diff HEAD -U0 -- "*.scss"', {
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

  // Archivos nuevos sin trackear: cuentan enteros.
  const untracked = execSync(
    'git ls-files --others --exclude-standard -- "*.scss"',
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

const violations = [];

for (const [file, lines] of addedLinesByFile()) {
  if (!file || file === TOKENS_FILE) continue;

  const comments = commentLines(file);

  for (const {number, text} of lines) {
    // Valvula de escape. Existen valores legitimos fuera de escala (un
    // `1px` de borde, un truco de accesibilidad). Sin una forma explicita de
    // saltearlos, el primer caso raro termina con alguien sacando el paso del
    // gate — que es mucho peor. Queda visible en el diff y hay que explicarlo.
    if (text.includes('design-tokens-ignore')) continue;

    // Los comentarios mencionan valores a propósito (explican por qué se
    // eligió algo); no son declaraciones. El caso multilínea se resuelve
    // leyendo el archivo entero: ver scripts/lib/comment-lines.mjs.
    if (comments.has(number)) continue;
    const code = text.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '');

    for (const {property, allowed, hint, multi} of RULES) {
      const match = code.match(
        new RegExp(`(^|[;{\\s])${property}:\\s*([^;]+)`),
      );
      if (!match) continue;

      const value = match[2].trim().replace(/\s*!important$/, '');
      if (allowed.has(value)) continue;

      if (multi && !value.includes('calc(')) {
        const parts = value.split(/\s+/).filter(Boolean);
        const offenders = parts.filter((part) => !allowed.has(part));
        if (!offenders.length) continue;

        violations.push({
          file,
          number,
          property,
          value: offenders.join(' '),
          hint,
        });
        continue;
      }

      violations.push({file, number, property, value, hint});
    }

    for (const property of SHORTHANDS) {
      const match = code.match(
        new RegExp(`(^|[;{\\s])${property}(-\\w+)?:\\s*([^;]+)`),
      );
      if (!match) continue;

      const value = match[3].trim().replace(/\s*!important$/, '');
      // `calc(1rem + 2px)` tiene espacios adentro: no se puede partir a lo
      // bruto sin romperlo.
      if (value.includes('calc(')) continue;

      const offenders = value
        .split(/\s+/)
        .filter((part) => part && !isAcceptableSpacing(part));

      if (offenders.length) {
        violations.push({
          file,
          number,
          property: property + (match[2] ?? ''),
          value: offenders.join(' '),
          hint: 'usá la escala de espaciado (--space-1 … --space-16)',
        });
      }
    }

    // Colores crudos: el nombre del token dice para qué sirve, `#e6d9c6` no.
    const hex = code.match(/#[0-9a-fA-F]{3,8}\b/);
    if (hex && !/url\(/.test(code)) {
      violations.push({
        file,
        number,
        property: 'color',
        value: hex[0],
        hint: 'usá un token de color de _app.scss en vez de un hex crudo',
      });
    }
  }
}

if (violations.length === 0) {
  process.exit(0);
}

console.error('');
for (const v of violations) {
  console.error(`${v.file}:${v.number}`);
  console.error(`  ${v.property}: ${v.value}  →  ${v.hint}`);
}
console.error(
  `\n✖ ${violations.length} valor(es) fuera de escala en líneas nuevas.` +
    '\n  Las escalas están en DESIGN.md. La deuda vieja no bloquea.\n',
);
process.exit(1);
