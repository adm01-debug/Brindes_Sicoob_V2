import ts from 'typescript';
import { createHash } from 'node:crypto';

// Contrato estático: import vinculado a uma chamada real. Não prova cobertura
// de todos os retornos; essa parte é exercitada nos cenários do wrapper.
export function hasStructuredLogging(source) {
  const ast = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true);
  const names = new Set();
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== '../_shared/structured-logger.ts') continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements) {
        if (['createStructuredLogger', 'withStructuredLogging'].includes((binding.propertyName ?? binding.name).text)) names.add(binding.name.text);
      }
    }
  }
  let found = false;
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && names.has(node.expression.text)) found = true;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return found;
}

// Exceção exclusiva ao stub revisado: qualquer mudança exige nova avaliação.
// Nunca executa código de um PR dentro do verificador.
export function isReviewedInactiveEndpoint(name, source) {
  return name === 'migrate-helper' && createHash('sha256').update(source).digest('hex') === '88fc996845be9c97ec00d8c7fe65f3e12a7c21e6b4dd22468f7d4573e887d7ec';
}
