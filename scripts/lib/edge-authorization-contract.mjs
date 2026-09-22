import ts from 'typescript';

// Evidência estática de chamadas reais; não substitui execução por ator nem
// análise de fluxo de controle (uma chamada pode estar em um ramo não alcançado).
export function inspectAuthorization(source) {
  const ast = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true);
  const importedNames = new Set();
  for (const node of ast.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || node.moduleSpecifier.text !== '../_shared/authorize.ts') continue;
    const bindings = node.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const binding of bindings.elements) {
      if ((binding.propertyName ?? binding.name).text === 'authorize') importedNames.add(binding.name.text);
    }
  }
  const result = { sharedRoles: [], validatesIdentity: false, validatesRole: false };
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee) && importedNames.has(callee.text) && ts.isAwaitExpression(node.parent)) {
        const opts = node.arguments[1];
        if (opts && ts.isObjectLiteralExpression(opts)) {
          for (const property of opts.properties) {
            if (ts.isPropertyAssignment(property) && property.name.getText(ast) === 'requireRole' && ts.isStringLiteral(property.initializer)) result.sharedRoles.push(property.initializer.text);
          }
        }
      }
      if (ts.isPropertyAccessExpression(callee)) {
        if (callee.name.text === 'getUser' && ts.isPropertyAccessExpression(callee.expression) && callee.expression.name.text === 'auth') result.validatesIdentity = true;
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument)) {
          if (callee.name.text === 'from' && argument.text === 'user_roles') result.validatesRole = true;
          if (callee.name.text === 'rpc' && ['has_role', 'is_dev', 'is_admin', 'is_supervisor_or_above'].includes(argument.text)) result.validatesRole = true;
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return result;
}
