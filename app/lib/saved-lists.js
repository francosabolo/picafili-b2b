/**
 * Listas de reposición guardadas (E6 · recompra en un clic).
 *
 * Viven en **localStorage**, no en la cookie del presupuesto. El presupuesto
 * ya roza el techo de 4 KB de las cookies (ver §5.5 del backlog): sumarle las
 * listas ahí lo haría desaparecer en silencio, que es la falla que más caro
 * sale. Además las listas nunca necesitan viajar al servidor, así que mandarlas
 * en cada request sería puro peso.
 *
 * Solo se guarda `{id, quantity}` por línea: precio, stock y quiebres se
 * vuelven a pedir al recargar (`/api/variants`). Guardar el precio sería
 * guardar una foto vieja y volcarla al pedido meses después.
 *
 * Es almacenamiento del navegador, no del cliente logueado: si el comprador
 * cambia de máquina, sus listas no lo siguen. Para eso hacen falta metafields
 * de customer o una tabla propia — decisión de negocio pendiente.
 */

const STORAGE_KEY = 'savedQuoteLists';

/** @returns {Array<{id: string, name: string, createdAt: string, items: Array}>} */
export function readSavedLists() {
  if (typeof localStorage === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    // localStorage corrupto o bloqueado (modo privado): la app sigue andando
    // sin listas, no revienta la pantalla.
    return [];
  }
}

function writeSavedLists(lists) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Guarda el presupuesto actual como lista.
 *
 * @param {string} name
 * @param {Array<{id: string, quantity: number}>} quoteItems
 * @param {string} createdAt ISO date — se pasa desde afuera para no clavar
 *   `new Date()` acá dentro y poder testear.
 */
export function saveList(name, quoteItems, createdAt) {
  const trimmed = String(name || '').trim();
  const items = (quoteItems ?? [])
    .filter((item) => item?.id)
    .map((item) => ({id: item.id, quantity: Number(item.quantity) || 1}));

  if (!trimmed || !items.length) return null;

  const list = {
    // Sin Math.random(): el nombre ya es único por lista y el timestamp
    // desempata si alguien repite nombre.
    id: `${createdAt}-${trimmed.toLowerCase()}`,
    name: trimmed,
    createdAt,
    items,
  };

  // Mismo nombre = se pisa. Un comprador que guarda "reposición mensual" dos
  // veces quiere actualizarla, no tener dos listas iguales.
  const lists = readSavedLists().filter(
    (saved) => saved.name.toLowerCase() !== trimmed.toLowerCase(),
  );

  return writeSavedLists([list, ...lists]) ? list : null;
}

/**
 * @param {string} id
 */
export function deleteList(id) {
  const lists = readSavedLists().filter((saved) => saved.id !== id);
  writeSavedLists(lists);
  return lists;
}

/**
 * Revalida una lista contra el catálogo y devuelve líneas listas para el
 * presupuesto.
 *
 * @param {Array<{id: string, quantity: number}>} items
 * @returns {Promise<{lines: Array, missingIds: Array<string>}>}
 */
export async function resolveList(items) {
  const response = await fetch('/api/variants', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({items}),
  });

  if (!response.ok) {
    throw new Error(`No se pudo recuperar la lista (${response.status})`);
  }

  return response.json();
}
