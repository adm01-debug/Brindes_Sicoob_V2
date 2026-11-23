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
  providerId = 'email-sintetico',
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
                supabaseAdmin: { from: NO_STORE },
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
