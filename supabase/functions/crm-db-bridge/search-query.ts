const SEARCHABLE_COMPANY_COLUMNS = new Set([
  "title",
  "nome_fantasia",
  "razao_social",
  "cnpj",
  "cidade",
]);

function escapePostgrestValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/[%_]/g, "\\$&")
    .replace(/"/g, "\\\"");
}

/** Monta a expressão OR com colunas permitidas e termo tratado como valor literal. */
export function buildCompanySearchOr(columns: string[], term: string): string {
  if (!term.trim() || columns.length === 0 || columns.some((column) => !SEARCHABLE_COMPANY_COLUMNS.has(column))) {
    throw new Error("Unsupported CRM search columns or empty term");
  }
  const escapedTerm = escapePostgrestValue(term);
  return columns.map((column) => `${column}.ilike."%${escapedTerm}%"`).join(",");
}
