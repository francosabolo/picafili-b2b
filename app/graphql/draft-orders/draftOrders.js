/**
 * Crea el draft order de una cotización.
 *
 * `userErrors` NO estaba en la selección, así que `draftOrderCreate.userErrors`
 * llegaba `undefined` y el chequeo de la ruta nunca se disparaba: una mutation
 * rechazada por Shopify (variante inexistente, email inválido) devolvía 200 con
 * `draftOrder: null` y al comprador se le decía que su pedido había salido.
 *
 * `poNumber` se devuelve para poder confirmar que quedó grabado.
 */
export const DRAFT_ORDER_CREATE_MUTATION = `#graphql
mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
        draftOrder {
            id
            name
            poNumber
        }
        userErrors {
            field
            message
        }
    }
}`;
