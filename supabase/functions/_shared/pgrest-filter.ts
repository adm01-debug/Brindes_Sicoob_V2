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
  const safe: string[] = [];
  for (const character of String(value).normalize('NFKC')) {
    if (character === '\\') continue;
    if (character === '%' || character === '_') {
      safe.push(`\\${character}`);
      continue;
    }
    safe.push(/[(),*]/u.test(character) ? ' ' : character);
  }
  return safe.join('').trim().slice(0, 160);
}
