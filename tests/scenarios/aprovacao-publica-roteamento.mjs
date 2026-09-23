import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const routes = readFileSync('src/routes/config/public.ts', 'utf8');
const legacySource = readFileSync('supabase/functions/quote-public-view/index.ts', 'utf8');

test('todos os aliases públicos usam a página ligada ao contrato transacional', () => {
  for (const path of ['/approve/:token', '/proposta/:token', '/public/orcamento/:token/aprovacao']) {
    const start = routes.indexOf(`path: "${path}"`);
    assert.notEqual(start, -1, `rota ausente: ${path}`);
    assert.match(routes.slice(start, start + 180), /import\("@\/pages\/QuoteApprovalPage"\)/);
  }
  assert.doesNotMatch(routes, /import\("@\/pages\/PublicQuoteApprovalPage"\)/);
});

test('endpoint distribuído legado responde 410 antes de banco, credenciais ou rede', async () => {
  const source = ts.transpileModule(legacySource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
    .replace(/require\("\.\.\/_shared\/cors\.ts"\)/g, 'require("cors")')
    .replace(/require\("\.\.\/_shared\/structured-logger\.ts"\)/g, 'require("logger")')
    .replace(/require\("https:\/\/deno\.land\/std@0\.190\.0\/http\/server\.ts"\)/g, 'require("serve")');

  let handler;
  let sideEffects = 0;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'Deno', source)(
    (name) => {
      if (name === 'cors') return {
        getCorsHeaders: () => ({ 'Access-Control-Allow-Origin': '*' }),
        handleCorsPreflightIfNeeded: () => null,
      };
      if (name === 'logger') return { withStructuredLogging: (_name, fn) => fn };
      if (name === 'serve') return { serve: (fn) => { handler = fn; } };
      sideEffects += 1;
      throw new Error(`dependência inesperada: ${name}`);
    },
    module,
    module.exports,
    { env: { get: () => { sideEffects += 1; } } },
  );

  const response = await handler(new Request('https://portal.invalid/functions/v1/quote-public-view', { method: 'POST' }));
  assert.equal(response.status, 410);
  assert.equal((await response.json()).error, 'endpoint_descontinuado');
  assert.equal(sideEffects, 0);
  assert.doesNotMatch(legacySource, /createClient|resolveCredential|\.from\(|\.rpc\(|fetch\(/);
});
