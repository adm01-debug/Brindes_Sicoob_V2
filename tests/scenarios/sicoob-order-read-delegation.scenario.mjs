// Guarda da leitura de pedidos Sicoob: a delegação de aprovação precisa continuar
// valendo na RLS e o cliente não pode refiltrar por papel.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const MIGRATIONS = 'supabase/migrations';
const orderService = readFileSync('src/services/sicoob/orderService.ts', 'utf8');

function ultimaDefinicao(nome) {
  return readdirSync(MIGRATIONS)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .map(file => ({ file, sql: readFileSync(`${MIGRATIONS}/${file}`, 'utf8') }))
    .filter(item => item.sql.includes(`FUNCTION public.${nome}(`))
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

test('policy de listagem alcanca o pedido delegado pelo helper de leitura', () => {
  const policy = readFileSync(`${MIGRATIONS}/20260927193000_sicoob_cross_cooperative_rls.sql`, 'utf8');
  assert.match(
    policy,
    /CREATE POLICY sicoob_orders_read_scoped[\s\S]*?sicoob_current_actor_can_read_order\(id\)/
  );
});

test('listOrders nao refiltra por papel no cliente', () => {
  const inicio = orderService.indexOf('async listOrders');
  const escopo = orderService.slice(inicio, orderService.indexOf('async getOrderById'));
  assert.notEqual(inicio, -1, 'listOrders nao encontrada');
  assert.doesNotMatch(escopo, /profile/i, 'listOrders voltou a consultar perfis/papeis');
  assert.doesNotMatch(orderService, /applyProfileScope/);
});
