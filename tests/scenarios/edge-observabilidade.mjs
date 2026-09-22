import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { hasStructuredLogging, isReviewedInactiveEndpoint } from '../../scripts/lib/edge-logging-contract.mjs';

function carregarLogger(linhas) {
  const cache = new Map();
  function carregar(nome) {
    if (cache.has(nome)) return cache.get(nome);
    const exports = {};
    cache.set(nome, exports);
    const source = readFileSync(`supabase/functions/_shared/${nome}`, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const registrar = line => linhas.push(JSON.parse(line));
    vm.runInNewContext(code, { exports, Response, Headers, URL, crypto, console: { log: registrar, warn: registrar, error: registrar }, require: path => carregar(path.replace('./', '')) });
    return exports;
  }
  return carregar('structured-logger.ts');
}
for (const status of [200, 204, 400, 401, 403, 405, 429, 500, 503]) {
  test(`wrapper preserva resposta ${status}, CORS e correlação sem dados sensíveis`, async () => {
    const linhas = [];
    const { withStructuredLogging } = carregarLogger(linhas);
    const req = new Request('https://simulacao.invalid/funcao?token=segredo', { method: 'POST', headers: { Authorization: 'Bearer segredo', 'X-Request-Id': 'correlacao-sintetica' }, body: 'conteudo-sensivel' });
    const body = status === 204 ? null : 'resposta-original';
    const response = await withStructuredLogging('funcao', () => new Response(body, { status, headers: { 'Access-Control-Allow-Origin': 'https://portal.invalid' } }))(req);
    assert.equal(response.status, status);
    assert.equal(await response.text(), body ?? '');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://portal.invalid');
    assert.equal(response.headers.get('X-Request-Id'), 'correlacao-sintetica');
    assert.equal(linhas.length, 2);
    assert.equal(linhas[1].event, 'request_end');
    assert.equal(linhas[1].status, status);
    assert.equal(linhas[1].request_id, 'correlacao-sintetica');
    assert.equal(linhas[1].level, status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info');
    assert.doesNotMatch(JSON.stringify(linhas), /segredo|conteudo-sensivel|resposta-original/);
  });
}
test('exceção inesperada vira 500 correlacionado sem expor a mensagem', async () => {
  const linhas = [];
  const { withStructuredLogging } = carregarLogger(linhas);
  const response = await withStructuredLogging('funcao', () => { throw new Error('credencial-confidencial'); })(new Request('https://simulacao.invalid'));
  assert.equal(response.status, 500);
  assert.ok(response.headers.get('X-Request-Id'));
  assert.doesNotMatch(await response.text() + JSON.stringify(linhas), /credencial-confidencial/);
});
const importacao = 'import { createStructuredLogger as logger } from "../_shared/structured-logger.ts";';
for (const source of [importacao, `${importacao}\n// logger({});`, `${importacao}\nconst exemplo = "logger({})";`, 'createStructuredLogger({});']) {
  test(`gate recusa import, comentário ou texto sem chamada vinculada: ${source}`, () => assert.equal(hasStructuredLogging(source), false));
}
test('gate aceita chamada com alias importado', () => assert.equal(hasStructuredLogging(`${importacao}\nlogger({});`), true));
test('exceção do endpoint inerte não permite adicionar acesso ao ambiente', () => {
  const source = readFileSync('supabase/functions/migrate-helper/index.ts', 'utf8');
  assert.equal(isReviewedInactiveEndpoint('migrate-helper', source), true);
  assert.equal(isReviewedInactiveEndpoint('outro-endpoint', source), false);
  assert.equal(isReviewedInactiveEndpoint('migrate-helper', source + '\nDeno.env.get("SEGREDO");'), false);
});
