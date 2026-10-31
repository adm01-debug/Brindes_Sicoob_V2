/** Escapa caracteres que tienen significado en los patrones LIKE/ILIKE de PostgreSQL. */
export function escapeIlikeSearchTerm(term: string): string {
  return term.replace(/[\\%_]/g, (character) => `\\${character}`);
}
