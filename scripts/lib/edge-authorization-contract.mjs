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
      // `authorize` NÃO lança: devolve `{ ok: false, response }`. `await authorize(...)` como statement
      // (resultado descartado) deixa a função aberta e antes contava como enforcement.
      if (ts.isIdentifier(callee) && importedNames.has(callee.text) && ts.isAwaitExpression(node.parent) && !ts.isExpressionStatement(node.parent.parent)) {
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

const RESPONSE_SINKS = new Set(['JSON.stringify', 'Response.json', 'jsonResponse', 'json', 'respond', 'errorResponse']);

/**
 * Credenciais de serviço que chegam ao corpo de uma resposta (incidente migrate-helper).
 *
 * Segue o valor por AST: `Deno.env.get("<SEGREDO>")` (aspas, template ou constante string do
 * arquivo) e os identificadores que o recebem (`const k = Deno.env.get(...) ?? ""`) são
 * "tainted"; é exposição quando um deles aparece dentro dos argumentos de `new Response(...)`,
 * `Response.json(...)`, `JSON.stringify(...)` ou de um helper de resposta (`json`, `jsonResponse`...).
 * Usar o segredo em `createClient(...)` ou num header de chamada de saída não é exposição.
 * Cobre atribuição direta e uma passagem de propagação (`const b = k`); não é análise de fluxo completa.
 *
 * @returns {{ env: string, line: number }[]}
 */
export function findSecretExposure(source, envs) {
  const ast = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true);
  const stringConstants = new Map();
  (function collect(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
      stringConstants.set(node.name.text, node.initializer.text);
    }
    ts.forEachChild(node, collect);
  })(ast);

  const literalText = (node) => {
    if (!node) return null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isIdentifier(node)) return stringConstants.get(node.text) ?? null;
    return null;
  };
  const strip = (node) => {
    let current = node;
    while (current && (ts.isParenthesizedExpression(current) || ts.isNonNullExpression(current) || ts.isAsExpression(current) || ts.isAwaitExpression(current))) current = current.expression;
    return current;
  };
  // Expressão que ESTÁ o segredo (Deno.env.get(X), X sensível; com ?? / || / ! / as ao redor).
  const secretOf = (node, tainted) => {
    const current = strip(node);
    if (!current) return null;
    if (ts.isBinaryExpression(current) && ['??', '||'].includes(current.operatorToken.getText(ast))) {
      return secretOf(current.left, tainted) ?? secretOf(current.right, tainted);
    }
    if (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
      const callee = current.expression;
      const target = callee.expression.getText(ast);
      if ((target === 'Deno.env' && callee.name.text === 'get') || (target === 'process.env' && false)) {
        const name = literalText(current.arguments[0]);
        if (name && envs.includes(name)) return name;
      }
    }
    if (ts.isIdentifier(current) && tainted.has(current.text)) return tainted.get(current.text);
    return null;
  };

  const tainted = new Map();
  for (let pass = 0; pass < 2; pass++) {
    (function visit(node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const env = secretOf(node.initializer, tainted);
        if (env) tainted.set(node.name.text, env);
      }
      ts.forEachChild(node, visit);
    })(ast);
  }

  const found = [];
  const calleeName = (call) => call.expression.getText(ast).replace(/\s+/g, '');
  const mentionsSecret = (node) => {
    let hit = null;
    (function walk(child) {
      if (hit) return;
      const env = ts.isExpression(child) ? secretOf(child, tainted) : null;
      if (env) {
        hit = env;
        return;
      }
      if (ts.isShorthandPropertyAssignment(child) && tainted.has(child.name.text)) {
        hit = tainted.get(child.name.text);
        return;
      }
      ts.forEachChild(child, walk);
    })(node);
    return hit;
  };
  (function visit(node) {
    let sinkArgs = null;
    if (ts.isNewExpression(node) && node.expression.getText(ast) === 'Response') sinkArgs = node.arguments ?? [];
    else if (ts.isCallExpression(node) && RESPONSE_SINKS.has(calleeName(node))) sinkArgs = node.arguments;
    if (sinkArgs) {
      for (const argument of sinkArgs) {
        const env = mentionsSecret(argument);
        if (env) {
          found.push({ env, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1 });
          break;
        }
      }
    }
    ts.forEachChild(node, visit);
  })(ast);
  return found;
}
