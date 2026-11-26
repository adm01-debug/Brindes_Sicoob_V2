
// Guarda da leitura de pedidos Sicoob: a delegacao de aprovacao precisa seguir valendo
// na RLS efetiva (a politica consolidada preserva a expressao) e o cliente nao pode
// refiltrar por papel.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const MIGRATIONS = 'supabase/migrations';
const CONSOLIDACAO = '20261007233000_consolidate_permissive_rls_policies.sql';
const orderService = readFileSync('src/services/sicoob/orderService.ts', 'utf8');

const migrations = readdirSync(MIGRATIONS)
  .filter(file => file.endsWith('.sql'))
  .sort()
  .map(file => ({ file, sql: readFileSync(`${MIGRATIONS}/${file}`, 'utf8') }));

function ultimaDefinicao(nome) {
  return migrations.filter(item => item.sql.includes(`FUNCTION public.${nome}(`)).at(-1);
}

function ultimaPoliticaDeLeitura(tabela) {
  const re = new RegExp(`CREATE POLICY[^;]*?ON public\\.${tabela}\\b[^;]*;`, 'gs');
  return migrations
    .flatMap(item => [...item.sql.matchAll(re)].map(match => ({ file: item.file, sql: match[0] })))
    .filter(item => /FOR (SELECT|ALL)\b/.test(item.sql))
    .at(-1);
}

test('leitura do pedido mantem os dois ramos: escopo proprio e delegacao', () => {
  const definicao = ultimaDefinicao('sicoob_current_actor_can_read_order');
  assert.ok(definicao, 'sicoob_current_actor_can_read_order nao definida em nenhuma migracao');
  assert.match(
    definicao.sql,
    /sicoob_actor_can_manage_fulfillment\(auth\.uid\(\), p_order_id\)\s+OR public\.sicoob_actor_has_active_approval_delegation\(auth\.uid\(\), p_order_id\)/,
    `${definicao.file} perdeu o ramo da delegacao`
  );
});

test('a ultima politica de leitura de sicoob_orders passa pelo helper', () => {
  const policy = ultimaPoliticaDeLeitura('sicoob_orders');
  assert.ok(policy, 'nenhuma politica de leitura definida para public.sicoob_orders');
  assert.match(
    policy.sql,
    /sicoob_current_actor_can_read_order\(id\)/,
    `${policy.file}: a leitura de sicoob_orders deixou de usar o helper de escopo`
  );
});

test('a consolidacao de politicas preserva a expressao consolidada', () => {
  const consolidacao = readFileSync(`${MIGRATIONS}/${CONSOLIDACAO}`, 'utf8');
  assert.match(
    consolidacao,
    /\('sicoob_orders'\),/,
    'sicoob_orders saiu das tabelas consolidadas'
  );
  assert.match(
    consolidacao,
    /string_agg\(\s*format\('\(%s AND \(%s\)\)', policy\.role_guard, policy\.using_expression\),\s*' OR '/,
    'a consolidacao deixou de reproduzir a expressao original das politicas'
  );
});

test('listOrders nao refiltra por papel no cliente', () => {
  const inicio = orderService.indexOf('async listOrders');
  assert.notEqual(inicio, -1, 'listOrders nao encontrada');
  const escopo = orderService.slice(inicio, orderService.indexOf('async getOrderById'));
  assert.doesNotMatch(escopo, /profile/i, 'listOrders voltou a consultar perfis/papeis');
  assert.doesNotMatch(orderService, /applyProfileScope/);
});
