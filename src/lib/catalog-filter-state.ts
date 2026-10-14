/**
 * Mantém um filtro relacional ativo quando um refetch falha, desde que exista
 * uma resposta anterior (inclusive uma lista vazia) ainda disponível no cache.
 */
export function canApplyCatalogFilter(
  active: boolean,
  error: Error | null,
  hasData: boolean,
): boolean {
  return active && (!error || hasData);
}
