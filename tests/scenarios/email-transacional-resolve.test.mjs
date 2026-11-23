import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

/**
 * Exercita o resolve.ts REAL (sem mock): o teste de contrato em
 * email-transacional-legado.mjs substitui o resolvedor inteiro, então nenhuma
 * escolha de destinatário, status ou link era verificada.
 */
const source = ts.transpileModule(
  readFileSync('supabase/functions/send-transactional-email/resolve.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

const URL_BASE = 'https://portal.invalid';

function load() {
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, console, URL, Date });
  return module.exports;
}

const { resolveEmailIntent, orderStatusSentence } = load();

const SELLER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const QUOTE_ID = '33333333-3333-4333-8333-333333333333';
const ORDER_ID = '44444444-4444-4444-8444-444444444444';
const REQUEST_ID = '55555555-5555-4555-8555-555555555555';

function deps({ table = {}, recipient = null, token = 'token-sintetico' } = {}) {
  return {
    async find(name) {
      return table[name] ?? null;
    },
    async ensureApprovalToken() {
      return token;
    },
    async findApprovalRecipient() {
      return recipient;
    },
  };
}

function options(overrides = {}) {
  return {
    eventType: 'quote_sent',
    body: { quote_id: QUOTE_ID },
    user: { id: SELLER, email: 'vendedor@example.invalid' },
    canViewAll: false,
    publicAppUrl: URL_BASE,
    deps: deps(),
    ...overrides,
  };
}

const quote = (overrides = {}) => ({
  quotes: {
    client_email: 'cliente@example.invalid',
    client_name: 'Cliente',
    quote_number: 'COT-1',
    total: 100,
    status: 'sent',
    seller_id: SELLER,
    valid_until: null,
    ...overrides,
  },
});

test('quote_sent recusa rascunho: nada foi anunciado ao cliente', async () => {
  const result = await resolveEmailIntent(options({ deps: deps({ table: quote({ status: 'draft' }) }) }));
  assert.equal(result.ok, false);
  assert.equal(result.failure.error, 'orcamento_indisponivel');
});

test('quote_sent recusa orçamento vencido (portal rejeitaria o link)', async () => {
  const past = '2000-01-01';
  const result = await resolveEmailIntent(options({ deps: deps({ table: quote({ valid_until: past }) }) }));
  assert.equal(result.ok, false);
  assert.equal(result.failure.error, 'orcamento_vencido');
});

test('quote_sent emite link público para orçamento válido', async () => {
  const result = await resolveEmailIntent(options({ deps: deps({ table: quote() }) }));
  assert.equal(result.ok, true);
  assert.equal(result.intent.actionUrl, `${URL_BASE}/proposta/token-sintetico`);
});

test('quote_rejected não emite link: recusa do Kanban não cria resposta', async () => {
  const result = await resolveEmailIntent(options({
    eventType: 'quote_rejected',
    deps: deps({ table: quote({ status: 'rejected' }) }),
  }));
  assert.equal(result.ok, true);
  assert.equal(result.intent.actionUrl, undefined);
});

test('quote_rejected em orçamento vencido é enviado: a recusa não tem link', async () => {
  // O bloqueio por validade existe para não anunciar um link que o portal
  // rejeita. A recusa já está salva e não carrega link, então barrá-la
  // esconderia do cliente um estado que existe.
  const result = await resolveEmailIntent(options({
    eventType: 'quote_rejected',
    deps: deps({ table: quote({ status: 'rejected', valid_until: '2000-01-01' }) }),
  }));
  assert.equal(result.ok, true);
  assert.equal(result.intent.actionUrl, undefined);
});

test('quote_approved em orçamento vencido continua barrado por 409', async () => {
  const result = await resolveEmailIntent(options({
    eventType: 'quote_approved',
    deps: deps({ table: quote({ status: 'approved', valid_until: '2000-01-01' }) }),
  }));
  assert.equal(result.ok, false);
  assert.equal(result.failure.error, 'orcamento_vencido');
});

test('quote_rejected exige status recusado', async () => {
  const result = await resolveEmailIntent(options({
    eventType: 'quote_rejected',
    deps: deps({ table: quote({ status: 'sent' }) }),
  }));
  assert.equal(result.ok, false);
  assert.equal(result.failure.error, 'orcamento_nao_recusado');
});

test('pedido legado sem client_email usa o e-mail da sessão', async () => {
  const result = await resolveEmailIntent(options({
    eventType: 'sicoob_order_status_change',
    body: { order_id: ORDER_ID },
    deps: deps({
      table: {
        sicoob_orders: null,
        orders: { order_number: 'PED-1', status: 'em_producao', total: 10, client_email: null, client_name: null, seller_id: SELLER },
      },
    }),
  }));
  assert.equal(result.ok, true);
  assert.equal(result.intent.recipientEmail, 'vendedor@example.invalid');
  assert.equal(result.intent.actionUrl, undefined);
  assert.equal(result.intent.data.status_sentence, 'está em produção.');
});

test('status legado em português tem frase própria, não o fallback', async () => {
  assert.equal(orderStatusSentence('cancelado'), 'foi cancelado.');
  assert.equal(orderStatusSentence('concluido'), 'foi concluído.');
  assert.equal(orderStatusSentence('in_production'), 'foi confirmado e já está em produção.');
  assert.equal(orderStatusSentence('inexistente'), 'foi criado com sucesso.');
});

test('aviso de aprovação carrega o número do pedido', async () => {
  const result = await resolveEmailIntent(options({
    eventType: 'sicoob_order_approval_request',
    body: { approval_request_id: REQUEST_ID },
    deps: deps({
      table: {
        sicoob_approval_requests: { order_id: ORDER_ID, requester_id: SELLER, approver_id: OTHER, status: 'pending', amount_at_request: 50 },
        sicoob_orders: { order_number: 'PED-9' },
      },
      recipient: { email: 'aprovador@example.invalid', full_name: 'Aprovador' },
    }),
  }));
  assert.equal(result.ok, true);
  assert.equal(result.intent.recipientEmail, 'aprovador@example.invalid');
  assert.equal(result.intent.data.order_number, 'PED-9');
});

test('quem não é dono do orçamento recebe 403', async () => {
  const result = await resolveEmailIntent(options({
    user: { id: OTHER, email: 'outro@example.invalid' },
    deps: deps({ table: quote() }),
  }));
  assert.equal(result.ok, false);
  assert.equal(result.failure.error, 'sem_permissao');
});
