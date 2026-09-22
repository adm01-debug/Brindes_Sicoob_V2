import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function carregar({ segredo = 'segredo-sintetico', settings = [], erro = null, statusEntrega = 200 } = {}) {
  let handler, clientes = 0;
  const envios = [];
  const fonte = readFileSync('supabase/functions/sicoob-approval-notifications/index.ts', 'utf8');
  const codigo = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const registros = { sicoob_approval_requests: { requester_id: 'ator-real', amount_at_request: 25, request_reason: 'motivo-real' }, profiles: { pa_id: 'pa-real', full_name: 'Nome real' }, pa_notification_settings: settings };
  const cliente = { from: tabela => {
    const consulta = { select: () => consulta, eq: () => consulta, single: () => consulta, maybeSingle: () => consulta, then: resolve => resolve({ data: registros[tabela], error: erro }) };
    return consulta;
  } };
  vm.runInNewContext(codigo, {
    exports: {}, Response, URL, AbortSignal,
    Deno: { env: { get: name => name === 'SUPABASE_SERVICE_ROLE_KEY' ? segredo : 'https://simulacao.invalid' } },
    fetch: async (url, opts) => { envios.push({ url, opts }); return new Response(null, { status: statusEntrega }); },
    require: name => {
      if (name.includes('http/server')) return { serve: fn => { handler = fn; } };
      if (name.includes('supabase-js')) return { createClient: () => { clientes++; return cliente; } };
      if (name.includes('structured-logger')) return { withStructuredLogging: (_fn, callback) => callback };
      throw new Error(`Dependência inesperada: ${name}`);
    },
  });
  return { chamar: handler, envios, clientes: () => clientes };
}
function requisicao(credencial = 'segredo-sintetico', evento = { type: 'INSERT', payload: { table: 'sicoob_approval_requests', record: { id: 'registro-real', request_reason: 'motivo-forjado' } } }) {
  return new Request('https://simulacao.invalid', { method: 'POST', headers: credencial ? { Authorization: `Bearer ${credencial}` } : {}, body: JSON.stringify(evento) });
}
for (const credencial of [null, 'token-de-usuario', 'prefixo-segredo-sintetico', 'segredo-sintetico-sufixo']) {
  test(`webhook bloqueia credencial indevida antes de acessar banco: ${credencial}`, async () => {
    const app = carregar();
    assert.equal((await app.chamar(requisicao(credencial))).status, 401);
    assert.equal(app.clientes(), 0);
    assert.equal(app.envios.length, 0);
  });
}
test('ausência de credencial configurada não permite chamada anônima', async () => {
  const app = carregar({ segredo: '' });
  assert.equal((await app.chamar(requisicao(null))).status, 503);
  assert.equal(app.clientes(), 0);
});
test('evento inválido não é declarado entregue', async () => {
  const app = carregar();
  assert.equal((await app.chamar(requisicao(undefined, { type: 'DELETE' }))).status, 400);
  assert.equal(app.envios.length, 0);
});
const slack = { channel: 'slack', webhook_url: 'https://hooks.slack.com/services/sintetico' };
for (const caso of [
  { nome: 'banco indisponível', options: { erro: { message: 'segredo-no-erro' } }, esperado: 503 },
  { nome: 'email sem implementação', options: { settings: [slack, { channel: 'email', recipient_email: 'sintetico@example.invalid' }] }, esperado: 501 },
  { nome: 'destino externo indevido', options: { settings: [{ ...slack, webhook_url: 'http://127.0.0.1/servico' }] }, esperado: 400 },
]) {
  test(`${caso.nome} falha sem enviar mensagem`, async () => {
    const app = carregar(caso.options);
    const response = await app.chamar(requisicao());
    assert.equal(response.status, caso.esperado);
    assert.equal(app.envios.length, 0);
    assert.doesNotMatch(await response.text(), /segredo-no-erro|example.invalid/);
  });
}
for (const statusEntrega of [200, 429, 500]) {
  test(`resposta do destino ${statusEntrega} determina o resultado, usando dados do banco`, async () => {
    const app = carregar({ settings: [slack], statusEntrega });
    assert.equal((await app.chamar(requisicao())).status, statusEntrega === 200 ? 200 : 502);
    assert.equal(app.envios.length, 1);
    assert.match(app.envios[0].opts.body, /motivo-real/);
    assert.doesNotMatch(app.envios[0].opts.body, /motivo-forjado/);
    assert.equal(app.envios[0].opts.redirect, 'error');
  });
}

test('envelope nativo do Database Webhook é aceito', async () => {
  const app = carregar({ settings: [slack] });
  const response = await app.chamar(requisicao(undefined, { type: 'INSERT', schema: 'public', table: 'sicoob_approval_requests', record: { id: 'registro-real' } }));
  assert.equal(response.status, 200);
  assert.equal(app.envios.length, 1);
});
test('JSON inválido retorna erro de entrada', async () => {
  const app = carregar();
  const response = await app.chamar(new Request('https://simulacao.invalid', { method: 'POST', headers: { Authorization: 'Bearer segredo-sintetico' }, body: '{' }));
  assert.equal(response.status, 400);
  assert.equal(app.envios.length, 0);
});
