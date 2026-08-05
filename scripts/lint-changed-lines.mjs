#!/usr/bin/env node
/**
 * Lint acotado a las líneas que toca el cambio.
 *
 * El fork arrastra ~159 errores de lint preexistentes. Lintear el archivo
 * completo hacía que cualquier ajuste de dos líneas obligara a limpiar toda la
 * deuda del archivo antes de poder cerrar la tarea. Esto mantiene la garantía
 * que importa —el código nuevo entra limpio— sin el peaje.
 *
 * Uso: node scripts/lint-changed-lines.mjs <base-ref>
 */
import {execFileSync} from 'node:child_process';

const baseRef = process.argv[2] || 'origin/main';
const EXT = /\.(js|jsx|ts|tsx)$/;
const IGNORED = /(^|\/)(dist|build|node_modules)\//;

const git = (args) => {
  try {
    return execFileSync('git', args, {encoding: 'utf8'});
  } catch {
    return '';
  }
};

/** Líneas agregadas o modificadas por archivo, leídas de los hunks del diff. */
function addedLines(diffArgs) {
  const out = git(['diff', '-U0', ...diffArgs]);
  const perFile = new Map();
  let current = null;

  for (const line of out.split('\n')) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      current = fileMatch[1];
      if (!perFile.has(current)) perFile.set(current, new Set());
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk && current) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      for (let i = 0; i < count; i++) perFile.get(current).add(start + i);
    }
  }
  return perFile;
}

function merge(target, source) {
  for (const [file, lines] of source) {
    if (!target.has(file)) target.set(file, new Set());
    for (const line of lines) target.get(file).add(line);
  }
}

const changed = new Map();
merge(changed, addedLines([`${baseRef}...HEAD`]));
merge(changed, addedLines(['HEAD']));

// Los archivos nuevos sin trackear cuentan enteros: todo en ellos es código nuevo.
const untracked = git(['ls-files', '--others', '--exclude-standard'])
  .split('\n')
  .filter((f) => f && EXT.test(f) && !IGNORED.test(f));

for (const file of untracked) changed.set(file, 'ALL');

const files = [...changed.keys()].filter(
  (f) => EXT.test(f) && !IGNORED.test(f) && !f.endsWith('.generated.d.ts'),
);

if (files.length === 0) {
  console.log('Sin archivos JS/JSX modificados — nada que lintear.');
  process.exit(0);
}

console.log(files.map((f) => `  · ${f}`).join('\n'));

let report = [];
try {
  const raw = execFileSync(
    'npx',
    ['eslint', '--no-error-on-unmatched-pattern', '--format', 'json', ...files],
    {encoding: 'utf8', env: {...process.env, ESLINT_USE_FLAT_CONFIG: 'false'}},
  );
  report = JSON.parse(raw);
} catch (error) {
  // eslint sale con código 1 cuando hay errores: el JSON viene igual en stdout.
  try {
    report = JSON.parse(error.stdout || '[]');
  } catch {
    console.error(error.stdout || error.message);
    process.exit(1);
  }
}

const cwd = process.cwd() + '/';
let failures = 0;

for (const result of report) {
  const relative = result.filePath.replace(cwd, '');
  const lines = changed.get(relative);
  if (!lines) continue;

  const offenders = result.messages.filter(
    (m) => m.severity === 2 && (lines === 'ALL' || lines.has(m.line)),
  );

  if (offenders.length === 0) continue;

  console.error(`\n${relative}`);
  for (const m of offenders) {
    console.error(`  ${m.line}:${m.column}  ${m.message}  (${m.ruleId})`);
    failures++;
  }
}

if (failures > 0) {
  console.error(
    `\n✖ ${failures} error(es) de lint en líneas nuevas. La deuda preexistente del fork no bloquea.`,
  );
  process.exit(1);
}

console.log('Sin errores de lint en las líneas nuevas.');
