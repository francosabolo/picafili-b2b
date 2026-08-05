import {readFileSync} from 'node:fs';

/**
 * Números de línea que caen dentro de un comentario, para un archivo.
 *
 * **Por qué hace falta.** Los chequeos del gate corren sobre las *líneas
 * agregadas* del diff, y las miran de a una. Sacar comentarios con un regex por
 * línea funciona con `//` y con `/* … *\/` de una sola línea, pero no con un
 * bloque multilínea: la primera línea abre y no cierra, las del medio no tienen
 * delimitador y parecen código.
 *
 * El síntoma es incómodo y ya pasó dos veces en este repo: **documentar un bug
 * dispara el chequeo de ese bug**. Un comentario que explica por qué se sacó un
 * `padding: 1rem` global hacía fallar el chequeo de escalas por ese mismo
 * `padding: 1rem`; y el doctor leía el ejemplo comentado de una constante como
 * si fuera la constante.
 *
 * Se resuelve leyendo el archivo entero una vez —que es donde el estado de
 * "estoy dentro de un comentario" existe— en vez de intentar deducirlo de una
 * línea suelta.
 *
 * No pretende ser un parser: no distingue un `/*` que aparece dentro de un
 * string. Para lo que se usa —decidir si una línea es explicación o código—
 * alcanza, y errar hacia "es comentario" solo hace el chequeo más permisivo,
 * nunca más ruidoso.
 *
 * @param {string} path
 * @returns {Set<number>} líneas (1-indexed) que son comentario
 */
export function commentLines(path) {
  const inComment = new Set();

  let source;
  try {
    source = readFileSync(path, 'utf8');
  } catch (error) {
    // Archivo borrado en el diff: no hay nada que marcar.
    return inComment;
  }

  let open = false;

  source.split('\n').forEach((line, index) => {
    const number = index + 1;
    const trimmed = line.trim();

    if (open) {
      inComment.add(number);
      if (trimmed.includes('*/')) open = false;
      return;
    }

    // Línea de comentario entera, en cualquiera de las dos sintaxis.
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
      inComment.add(number);
      return;
    }

    const opens = trimmed.lastIndexOf('/*');
    if (opens !== -1 && trimmed.indexOf('*/', opens) === -1) {
      open = true;
      // Si el bloque abre a mitad de línea, lo que va antes SÍ es código y la
      // línea no se marca entera.
      if (trimmed.startsWith('/*')) inComment.add(number);
    }
  });

  return inComment;
}
