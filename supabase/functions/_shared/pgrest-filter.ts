/**
 * Sanitização de valores interpolados em filtros PostgREST `.or(...)`.
 *
 * Em `.or("col.ilike.%${v}%,...")` os caracteres `,` `(` `)` são ESTRUTURAIS:
 * uma vírgula inicia uma nova condição e `)` fecha o grupo. Valores vindos de
 * entrada do usuário ou de saída de LLM podem conter esses caracteres e alterar
 * o filtro (injeção de filtro PostgREST). Também escapamos os wildcards LIKE
 * (`%`, `_`) para que sejam tratados como literais.
 */
export function sanitizeIlikeValue(value: string): string {
  return String(value)
    .replace(/\\/g, '')        // remove barras invertidas pré-existentes
    .replace(/[(),*]/g, ' ')   // neutraliza chars estruturais do `.or()`
    .replace(/%/g, '\\%')      // escapa wildcard LIKE
    .replace(/_/g, '\\_')      // escapa wildcard LIKE
    .trim();
}
