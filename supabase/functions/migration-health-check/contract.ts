// Ausência, erro de permissão e RLS desligado impedem resultado positivo.
export function evaluateMigrationHealth(
  roles: { data: string[] | null; error: unknown },
  tables: { table: string; exists: boolean }[],
  rls: { data: { table_name: string; rls_enabled: boolean }[] | null; error: unknown },
) {
  return !roles.error && !rls.error &&
    ['gestor_compras', 'gerente_pa'].every(role => roles.data?.includes(role)) &&
    tables.length > 0 && tables.every(table => table.exists &&
      rls.data?.some(row => row.table_name === table.table && row.rls_enabled === true));
}
