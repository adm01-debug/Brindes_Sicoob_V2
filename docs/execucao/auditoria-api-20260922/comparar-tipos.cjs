// Compara o contrato TypeScript do snapshot com os metadados reais da API.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('/home/joaquim_ataides/projetos/Brindes_Sicoob_V2/node_modules/typescript');
const root = path.resolve(__dirname, '../../..');
const text = fs.readFileSync(path.join(root, 'src/integrations/supabase/types.ts'), 'utf8');
const ast = ts.createSourceFile('types.ts', text, ts.ScriptTarget.Latest, true);
const api = JSON.parse(fs.readFileSync(path.join(__dirname, 'openapi-servidor.json'), 'utf8'));
const database = ast.statements.find(s => ts.isTypeAliasDeclaration(s) && s.name.text === 'Database');
function members(node) {
  return Object.fromEntries((node?.members ?? []).map(p => [p.name.getText(ast).replace(/^['"]|['"]$/g, ''), p.type]));
}
const publicSchema = members(members(database.type).public);
const tables = members(publicSchema.Tables);
const views = members(publicSchema.Views);
const funcs = members(publicSchema.Functions);
const relations = { ...tables, ...views };
const localNames = Object.keys(relations);
const apiNames = Object.keys(api.definitions);
const onlyLocal = localNames.filter(n => !apiNames.includes(n)).sort();
const onlyApi = apiNames.filter(n => !localNames.includes(n)).sort();
const differences = [];
for (const [name, node] of Object.entries(relations)) {
  if (!api.definitions[name]) continue;
  const row = members(members(node).Row);
  const props = api.definitions[name].properties;
  const localOnly = Object.keys(row).filter(p => !props[p]);
  const apiOnly = Object.keys(props).filter(p => !row[p]);
  if (localOnly.length || apiOnly.length) differences.push({ name, only_types: localOnly, only_api: apiOnly });
}
const rpcNames = Object.keys(api.paths).filter(n => n.startsWith('/rpc/')).map(n => n.slice(5));
const rpcDifferences = [];
for (const [name, node] of Object.entries(funcs)) {
  if (!rpcNames.includes(name)) continue;
  const params = api.paths['/rpc/' + name].post?.parameters?.find(p => p.name === 'args')?.schema;
  const argsNode = members(node).Args;
  if (!params || !argsNode || !ts.isTypeLiteralNode(argsNode)) continue;
  const args = members(argsNode);
  const remote = params.properties ?? {};
  const localOnly = Object.keys(args).filter(p => !remote[p]);
  const remoteOnly = Object.keys(remote).filter(p => !args[p]);
  if (localOnly.length || remoteOnly.length) rpcDifferences.push({ name, only_types: localOnly, only_api: remoteOnly });
}
const result = {
  live_api_metadata: true,
  scope: 'Presença de relações/colunas e nomes de argumentos RPC; sem certificar tipos SQL, nulabilidade, overloads ou corpos.',
  types_tables: Object.keys(tables).length, types_views: Object.keys(views).length,
  api_relations: apiNames.length, relations_only_types: onlyLocal, relations_only_api: onlyApi,
  columns_differences: differences,
  types_functions: Object.keys(funcs).length, api_functions: rpcNames.length,
  functions_only_types: Object.keys(funcs).filter(n => !rpcNames.includes(n)).sort(),
  functions_only_api: rpcNames.filter(n => !funcs[n]).sort(),
  rpc_argument_differences: rpcDifferences,
};
fs.writeFileSync(path.join(__dirname, 'tipos-versus-api.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
