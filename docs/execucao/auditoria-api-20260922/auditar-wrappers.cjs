// Auditoria complementar: resolve chamadas untypedFrom pela AST TypeScript.
// Nenhuma chamada de aplicação é executada e nenhum banco é acessado.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('/home/joaquim_ataides/projetos/Brindes_Sicoob_V2/node_modules/typescript');
const root = path.resolve(__dirname, '../../..');
const cache = JSON.parse(fs.readFileSync(path.join(root, 'scripts/db/.inventory-cache.json'), 'utf8'));
const known = new Set([...cache.tables, ...cache.views]);
const findings = [];

function inspect(file) {
  const text = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const wrappers = new Set();
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!statement.moduleSpecifier.text.endsWith('/supabase-untyped')) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const item of bindings.elements) {
      if ((item.propertyName ?? item.name).text === 'untypedFrom') wrappers.add(item.name.text);
    }
  }
  if (!wrappers.size) return;
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && wrappers.has(node.expression.text)) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) findings.push({
        file: path.relative(root, file),
        line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
        resource: arg.text,
        present_in_historical_cache: known.has(arg.text),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(e.name)) inspect(full);
  }
}
walk(path.join(root, 'src'));
const missing = findings.filter(x => !x.present_in_historical_cache);
const result = { cache_date: cache.generated_at, live_database_verified: false, calls: findings,
  missing_calls: missing.length, missing_resources: [...new Set(missing.map(x => x.resource))].sort() };
fs.writeFileSync(path.join(__dirname, 'referencias-wrappers.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ calls: findings.length, missing_calls: missing.length, missing_resources: result.missing_resources }));
