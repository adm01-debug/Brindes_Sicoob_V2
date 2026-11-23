import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(
  readFileSync('supabase/functions/send-transactional-email/index.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

const NO_STORE = () => assert.fail('lookup de tabela não deve usar o cliente anônimo');

function app({
  authenticated = true,
  configured = false,
  budgetAllowed = true,
  providerId = 'email-sintetico',
  rateLimitState = null,
  resolved = {
    ok: true,
    intent: {
      recipientEmail: 'cliente@example.invalid',
      recipientName: 'Cliente Sintetico',
      actionUrl: 'https://simulacao.invalid/proposta/token-sintetico',
      data: { quote_number: 'SINTETICO', total: 100 },
    },
  },
} = {}) {
  let handler;
  const calls = { resolve: [], deliver: [] };
  // Estado do teto compartilhado entre chamadas que simulam a mesma janela.
  const budget = rateLimitState ?? { used: new Map() };
  vm.runInNewContext(code, {
    exports: {}, Response, console,
    Deno: { env: { get: () => configured ? 'configuracao-sintetica' : undefined } },
    fetch: () => assert.fail('O transporte é responsabilidade de deliver.ts'),
    require: name => {
      if (name.includes('http/server')) return { serve: fn => { handler = fn; } };
      if (name.includes('_shared/cors')) return { getCorsHeaders: () => ({}) };
      if (name.includes('_shared/structured-logger')) return { withStructuredLogging: (_n, fn) => fn };
      if (name.includes('_shared/authorize')) {
        return {
          authorize: async () => authenticated
            ? {
                ok: true,
                user: { id: 'pessoa-sintetica' },
                role: 'agente',
                supabaseUser: { from: NO_STORE },
                supabaseAdmin: {
                  from: NO_STORE,
                  // check_rate_limit real: 3 por identificador. O identificador
                  // compõe usuário + evento + referência + transição.
                  rpc: async (_name, params) => {
                    const key = params._identifier;
                    if (!budgetAllowed) return { data: { allowed: false }, error: null };
                    const used = (budget.used.get(key) ?? 0) + 1;
                    budget.used.set(key, used);
                    return { data: { allowed: used <= params._max_requests }, error: null };
                  },
                },
              }
            : { ok: false, response: new Response(JSON.stringify({ error: 'nao_autenticado' }), { status: 401 }) },
        };
      }
      if (name.includes('./resolve.ts')) {
        return {
          resolveEmailIntent: async options => {
            calls.resolve.push(options);
            // Espelha resolve.ts: sem a referência do evento não há o que resolver.
            const reference = ['quote_id', 'order_id', 'approval_request_id'];
            return reference.some(key => key in options.body)
              ? resolved
              : { ok: false, failure: { status: 404, error: 'referencia_ausente' } };
          },
          orderStatusSentence: () => 'foi criado com sucesso.',
        };
      }
      if (name.includes('./deliver.ts')) {
        return {
          deliverTransactionalEmail: async message => {
            calls.deliver.push(message);
            return configured ? { accepted: true, providerId } : { accepted: false, errorCode: 'email_not_configured' };
          },
        };
      }
      if (name.includes('./templates.ts')) {
        return {
          renderTemplate: (eventType, context) => eventType === 'desconhecido'
            ? null
            : { subject: 'Assunto sintetico', html: `<p>${context.data?.action_url ?? 'sem-link'}</p>` },
        };
      }
      throw new Error(name);
    },
  });
  return { handler, calls };
}

const post = (body) => new Request('https://simulacao.invalid', {
  method: 'POST', headers: { Authorization: 'Bearer token-sintetico' }, body: JSON.stringify(body),
});

test('endpoint degrada com recibo estruturado sem provedor configurado', async () => {
  const { handler } = app();
  const response = await handler(post({ event_type: 'quote_sent', quote_id: 'orcamento-sintetico' }));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error, 'email_not_configured');
  assert.equal(body.delivered, false);
});

test('endpoint confirma entrega com recibo do provedor', async () => {
  const { handler, calls } = app({ configured: true });
  const response = await handler(post({ event_type: 'quote_sent', quote_id: 'orcamento-sintetico' }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.delivery_status, 'accepted');
  assert.equal(body.provider_id, 'email-sintetico');
  assert.equal(calls.deliver[0].recipientEmail, 'cliente@example.invalid');
  assert.match(calls.deliver[0].html, /proposta\/token-sintetico/);
});

test('sessão inválida não chega ao resolvedor', async () => {
  const { handler, calls } = app({ authenticated: false });
  assert.equal((await handler(post({ event_type: 'quote_sent', quote_id: 'x' }))).status, 401);
  assert.equal(calls.resolve.length, 0);
});

test('recusa destinatário e corpo vindos do cliente', async () => {
  const { handler, calls } = app({ configured: true });
  for (const forbidden of [
    { recipient_email: 'invasor@example.invalid' },
    { recipient_name: 'Invasor' },
    { data: { quote_number: 'FALSO' } },
    { action_url: 'https://invasor.invalid' },
  ]) {
    const response = await handler(post({ event_type: 'quote_sent', quote_id: 'orcamento-sintetico', ...forbidden }));
    assert.equal(response.status, 422);
    const body = await response.json();
    assert.equal(body.error, 'payload_invalido');
    assert.match(body.message, /Envie apenas event_type e a referência/);
  }
  assert.equal(calls.resolve.length, 0);
  assert.equal(calls.deliver.length, 0);
});

test('recusa método, JSON e evento inválidos sem transporte', async () => {
  const { handler } = app();
  assert.equal((await handler(new Request('https://simulacao.invalid', { method: 'GET', headers: { Authorization: 'Bearer token' } }))).status, 405);
  assert.equal((await handler(new Request('https://simulacao.invalid', { method: 'POST', headers: { Authorization: 'Bearer token' }, body: '{' }))).status, 400);
  assert.equal((await handler(post({ event_type: 'desconhecido', quote_id: 'x' }))).status, 422);
  assert.equal((await handler(post({ event_type: 'quote_sent' }))).status, 404);
});

test('propaga a recusa do resolvedor sem tocar no transporte', async () => {
  const { handler, calls } = app({ resolved: { ok: false, failure: { status: 403, error: 'sem_permissao' } } });
  const response = await handler(post({ event_type: 'quote_sent', quote_id: 'de-outro-vendedor' }));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, 'sem_permissao');
  assert.equal(calls.deliver.length, 0);
});

test('teto de envio barra o transporte mesmo quando o resolvedor aceita', async () => {
  const { handler, calls } = app({ configured: true, budgetAllowed: false });
  const response = await handler(post({ event_type: 'quote_sent', quote_id: 'orcamento-sintetico' }));
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error, 'limite_de_envio');
  // A referência e a transição só existem depois da resolução, por isso a cota
  // é checada depois dela. O que não pode acontecer é o e-mail sair.
  assert.equal(calls.deliver.length, 0);
});

function resolvedWithStatus(status) {
  return {
    ok: true,
    intent: {
      recipientEmail: 'cliente@example.invalid',
      recipientName: 'Cliente Sintetico',
      data: { order_number: 'PED-1', total: 100, status },
    },
  };
}

test('quatro transições distintas do mesmo pedido geram quatro avisos', async () => {
  const transitions = ['em_producao', 'separado', 'em_transporte', 'entregue'];
  const rateLimitState = { used: new Map() };
  for (const status of transitions) {
    const { handler, calls } = app({ configured: true, resolved: resolvedWithStatus(status), rateLimitState });
    const response = await handler(post({ event_type: 'sicoob_order_status_change', order_id: 'pedido-1' }));
    assert.equal(response.status, 200, `transição ${status} deveria ser enviada`);
    assert.equal(calls.deliver.length, 1);
  }
  assert.equal(transitions.length, 4);
});

test('quatro tentativas da mesma transição param na quarta', async () => {
  const statuses = [];
  const rateLimitState = { used: new Map() };
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { handler } = app({ configured: true, resolved: resolvedWithStatus('entregue'), rateLimitState });
    const response = await handler(post({ event_type: 'sicoob_order_status_change', order_id: 'pedido-1' }));
    statuses.push(response.status);
  }
  assert.deepEqual(statuses, [200, 200, 200, 429]);
});
