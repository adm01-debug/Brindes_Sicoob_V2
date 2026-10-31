// Compara nomes do contrato TypeScript com um snapshot OpenAPI; não acessa o banco.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
if (!process.argv[2]) {
  console.error('Uso: node scripts/db/compare-types-api.mjs <openapi.json>');
  process.exit(2);
}
const text = readFileSync(join(root, 'src/integrations/supabase/types.ts'), 'utf8');
const ast = ts.createSourceFile('types.ts', text, ts.ScriptTarget.Latest, true);
const rawApi = readFileSync(process.argv[2]);
const api = JSON.parse(rawApi);
const database = ast.statements.find(
  (s) => ts.isTypeAliasDeclaration(s) && s.name.text === 'Database',
);
function members(node) {
  return Object.fromEntries(
    (node?.members ?? []).map((p) => [p.name.getText(ast).replace(/^['"]|['"]$/g, ''), p.type]),
  );
}
const publicSchema = members(members(database.type).public);
const tables = members(publicSchema.Tables);
const views = members(publicSchema.Views);
const funcs = members(publicSchema.Functions);
const relations = { ...tables, ...views };
const localNames = Object.keys(relations);
const apiNames = Object.keys(api.definitions);
// Partições físicas tipadas pelo gerador do Supabase não são relações
// independentes na OpenAPI do PostgREST. A lista é explícita para que uma
// partição nova exija nova coleta e revisão, em vez de ser mascarada por regex.
const nonExposedPartitions = new Set([
  'admin_audit_log_default',
  'admin_audit_log_y2024',
  'admin_audit_log_y2025',
  'admin_audit_log_y2026_m01',
  'admin_audit_log_y2026_m02',
  'admin_audit_log_y2026_m03',
  'admin_audit_log_y2026_m04',
  'admin_audit_log_y2026_m05',
  'admin_audit_log_y2026_m06',
  'admin_audit_log_y2026_m07',
  'admin_audit_log_y2026_m08',
  'admin_audit_log_y2026_m09',
  'admin_audit_log_y2026_m10',
  'admin_audit_log_y2026_m11',
  'admin_audit_log_y2026_m12',
  'admin_audit_log_y2027_m01',
  'admin_audit_log_y2027_m02',
  'admin_audit_log_y2027_m03',
]);
const allOnlyLocal = localNames.filter((n) => !apiNames.includes(n)).sort();
const ignoredPartitions = allOnlyLocal.filter((n) => nonExposedPartitions.has(n));
const onlyLocal = allOnlyLocal.filter((n) => !nonExposedPartitions.has(n));
const onlyApi = apiNames.filter((n) => !localNames.includes(n)).sort();
const differences = [];
for (const [name, node] of Object.entries(relations)) {
  if (!api.definitions[name]) continue;
  const row = members(members(node).Row);
  const props = api.definitions[name].properties;
  const localOnly = Object.keys(row).filter((p) => !props[p]);
  const apiOnly = Object.keys(props).filter((p) => !row[p]);
  if (localOnly.length || apiOnly.length)
    differences.push({ name, only_types: localOnly, only_api: apiOnly });
}
const rpcNames = Object.keys(api.paths)
  .filter((n) => n.startsWith('/rpc/'))
  .map((n) => n.slice(5));
const rpcDifferences = [];
for (const [name, node] of Object.entries(funcs)) {
  if (!rpcNames.includes(name)) continue;
  const params = api.paths['/rpc/' + name].post?.parameters?.find((p) => p.name === 'args')?.schema;
  const argsNode = members(node).Args;
  if (!params || !argsNode || !ts.isTypeLiteralNode(argsNode)) continue;
  const args = members(argsNode);
  const remote = params.properties ?? {};
  const localOnly = Object.keys(args).filter((p) => !remote[p]);
  const remoteOnly = Object.keys(remote).filter((p) => !args[p]);
  if (localOnly.length || remoteOnly.length)
    rpcDifferences.push({ name, only_types: localOnly, only_api: remoteOnly });
}
const result = {
  source: 'Snapshot offline; não comprova estado remoto atual',
  openapi_sha256: createHash('sha256').update(rawApi).digest('hex'),
  types_sha256: createHash('sha256').update(text).digest('hex'),
  scope:
    'Presença de relações/colunas e nomes de argumentos RPC; sem certificar tipos SQL, nulabilidade, overloads ou corpos.',
  types_tables: Object.keys(tables).length,
  types_views: Object.keys(views).length,
  api_relations: apiNames.length,
  non_exposed_partitions: ignoredPartitions,
  relations_only_types: onlyLocal,
  relations_only_api: onlyApi,
  columns_differences: differences,
  types_functions: Object.keys(funcs).length,
  api_functions: rpcNames.length,
  functions_only_types: Object.keys(funcs)
    .filter((n) => !rpcNames.includes(n))
    .sort(),
  functions_only_api: rpcNames.filter((n) => !funcs[n]).sort(),
  rpc_argument_differences: rpcDifferences,
};
console.log(JSON.stringify(result, null, 2));
// Tipos sem objeto exposto exigem classificação; não provam remoção física.
process.exitCode =
  onlyApi.length ||
  onlyLocal.length ||
  differences.length ||
  result.functions_only_api.length ||
  result.functions_only_types.length ||
  rpcDifferences.length
    ? 1
    : 0;
