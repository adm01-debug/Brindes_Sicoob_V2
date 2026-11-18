/**
 * Regras do SLA de 24h e dos totais do mês da gestão de compras.
 *
 * Recupera os cenários da PR #119. O que eles travam não é a aritmética: é a
 * recusa em apresentar número parcial ou estimado como se fosse medido.
 */
import { describe, expect, it } from 'vitest';

import {
  calculatePurchasingMetrics,
  mapLatestManagerSubmissionTimes,
  metricLabel,
  type PurchasingOrder,
} from '@/lib/orders/purchasing-sla';
import type { OrderStatus } from '@/types/sicoob/orders';

function order(id: string, status: OrderStatus, total: number, createdAt: string): PurchasingOrder {
  return { id, status, total_amount: total, created_at: createdAt };
}

const agora = new Date('2026-10-13T12:00:00.000Z');

describe('métricas canônicas da gestão de compras', () => {
  it('calcula pendências, SLA e totais a partir dos pedidos visíveis', () => {
    const pendentes = {
      count: 2,
      data: [
        order('order-1', 'waiting_approval', 1_000, '2026-10-13T08:00:00.000Z'),
        order('order-2', 'waiting_approval', 2_000, '2026-10-11T08:00:00.000Z'),
      ],
    };
    const doMes = {
      count: 4,
      data: [
        order('order-3', 'draft', 500, '2026-10-02T08:00:00.000Z'),
        order('order-4', 'confirmed', 1_000, '2026-10-03T08:00:00.000Z'),
        order('order-5', 'in_production', 2_000, '2026-10-04T08:00:00.000Z'),
        order('order-6', 'cancelled', 7_000, '2026-10-05T08:00:00.000Z'),
      ],
    };
    const enviadoEm = new Map([
      ['order-1', '2026-10-13T08:00:00.000Z'],
      ['order-2', '2026-10-11T08:00:00.000Z'],
    ]);

    expect(calculatePurchasingMetrics(pendentes, doMes, agora, enviadoEm)).toEqual({
      pendingCount: 2,
      slaPercent: 50,
      monthlyTotal: 3_500,
      approvedTotal: 3_000,
    });
  });

  it('não apresenta agregado parcial quando a consulta trunca', () => {
    // 1.001 pedidos no banco, 1 linha devolvida: qualquer soma aqui seria uma
    // fração apresentada como total.
    const truncado = {
      count: 1_001,
      data: [order('order-1', 'waiting_approval', 1_000, '2026-10-13T08:00:00.000Z')],
    };

    expect(calculatePurchasingMetrics(truncado, truncado, agora, new Map())).toEqual({
      pendingCount: 1_001,
      slaPercent: null,
      monthlyTotal: null,
      approvedTotal: null,
    });
  });

  it('não usa a data de criação do pedido no lugar do histórico de aprovação', () => {
    const pendentes = {
      count: 1,
      data: [order('order-1', 'waiting_approval', 1_000, '2026-10-13T11:30:00.000Z')],
    };

    expect(calculatePurchasingMetrics(pendentes, pendentes, agora, new Map()).slaPercent).toBeNull();
  });

  it('cancelado sai do total do mês e não conta como aprovado', () => {
    const doMes = {
      count: 2,
      data: [
        order('order-1', 'cancelled', 9_000, '2026-10-02T08:00:00.000Z'),
        order('order-2', 'delivered', 1_000, '2026-10-03T08:00:00.000Z'),
      ],
    };

    const metrics = calculatePurchasingMetrics(undefined, doMes, agora, new Map());
    expect(metrics.monthlyTotal).toBe(1_000);
    expect(metrics.approvedTotal).toBe(1_000);
  });
});

describe('mapLatestManagerSubmissionTimes', () => {
  it('usa a entrada mais recente e ignora outros status e eventos sem pedido', () => {
    const enviadoEm = mapLatestManagerSubmissionTimes([
      { order_id: 'order-1', new_status: 'waiting_approval', created_at: '2026-10-13T10:00:00.000Z' },
      { order_id: 'order-1', new_status: 'pending', created_at: '2026-10-13T10:30:00.000Z' },
      { order_id: 'order-1', new_status: 'waiting_approval', created_at: '2026-10-13T11:30:00.000Z' },
      { order_id: null, new_status: 'waiting_approval', created_at: '2026-10-13T11:45:00.000Z' },
    ]);

    expect(enviadoEm.get('order-1')).toBe('2026-10-13T11:30:00.000Z');
    expect(enviadoEm.size).toBe(1);
  });

  it('descarta evento com data inválida em vez de contá-lo como recente', () => {
    const enviadoEm = mapLatestManagerSubmissionTimes([
      { order_id: 'order-1', new_status: 'waiting_approval', created_at: '2026-10-13T10:00:00.000Z' },
      { order_id: 'order-1', new_status: 'waiting_approval', created_at: 'data-quebrada' },
    ]);

    expect(enviadoEm.get('order-1')).toBe('2026-10-13T10:00:00.000Z');
  });
});

describe('metricLabel', () => {
  it('mostra travessão quando não há universo completo', () => {
    expect(metricLabel(null, (v) => `${v}%`)).toBe('—');
  });

  it('formata o número quando ele é confiável', () => {
    expect(metricLabel(50, (v) => `${v}%`)).toBe('50%');
  });
});
