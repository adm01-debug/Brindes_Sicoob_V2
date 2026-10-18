import { describe, expect, it } from 'vitest';

import { calculatePurchasingMetrics } from '@/pages/GestorCompras';
import { mapLatestManagerSubmissionTimes } from '@/lib/orders/purchasing-sla';
import type { OrderStatus } from '@/types/sicoob/orders';

interface PurchasingOrder {
  id: string;
  status: OrderStatus;
  total_amount: number | null;
  created_at: string;
}

function order(id: string, status: OrderStatus, total: number, createdAt: string): PurchasingOrder {
  return { id, status, total_amount: total, created_at: createdAt };
}

describe('métricas canônicas da gestão de compras', () => {
  const now = new Date('2026-10-13T12:00:00.000Z');

  it('calcula pendências, SLA e totais a partir dos pedidos Sicoob visíveis por RLS', () => {
    const pending = {
      count: 2,
      data: [
        order('order-1', 'waiting_approval', 1_000, '2026-10-13T08:00:00.000Z'),
        order('order-2', 'waiting_approval', 2_000, '2026-10-11T08:00:00.000Z'),
      ],
    };
    const monthly = {
      count: 4,
      data: [
        order('order-3', 'draft', 500, '2026-10-02T08:00:00.000Z'),
        order('order-4', 'confirmed', 1_000, '2026-10-03T08:00:00.000Z'),
        order('order-5', 'in_production', 2_000, '2026-10-04T08:00:00.000Z'),
        order('order-6', 'cancelled', 7_000, '2026-10-05T08:00:00.000Z'),
      ],
    };
    const submittedAt = new Map([
      ['order-1', '2026-10-13T08:00:00.000Z'],
      ['order-2', '2026-10-11T08:00:00.000Z'],
    ]);

    expect(calculatePurchasingMetrics(pending, monthly, now, submittedAt)).toEqual({
      pendingCount: 2,
      slaPercent: 50,
      monthlyTotal: 3_500,
      approvedTotal: 3_000,
    });
  });

  it('não apresenta agregados parciais quando o universo ultrapassa a consulta limitada', () => {
    const truncated = {
      count: 1_001,
      data: [order('order-1', 'waiting_approval', 1_000, '2026-10-13T08:00:00.000Z')],
    };

    expect(calculatePurchasingMetrics(truncated, truncated, now, new Map())).toEqual({
      pendingCount: 1_001,
      slaPercent: null,
      monthlyTotal: null,
      approvedTotal: null,
    });
  });

  it('não usa created_at do pedido como substituto de histórico de aprovação', () => {
    const pending = {
      count: 1,
      data: [order('order-1', 'waiting_approval', 1_000, '2026-10-13T11:30:00.000Z')],
    };

    expect(calculatePurchasingMetrics(pending, pending, now, new Map()).slaPercent).toBeNull();
  });

  it('usa a entrada mais recente em waiting_approval e ignora outros status e eventos sem pedido', () => {
    const sentAt = mapLatestManagerSubmissionTimes([
      { order_id: 'order-1', new_status: 'waiting_approval', created_at: '2026-10-13T10:00:00.000Z' },
      { order_id: 'order-1', new_status: 'pending', created_at: '2026-10-13T10:30:00.000Z' },
      { order_id: 'order-1', new_status: 'waiting_approval', created_at: '2026-10-13T11:30:00.000Z' },
      { order_id: null, new_status: 'waiting_approval', created_at: '2026-10-13T11:45:00.000Z' },
    ]);

    expect(sentAt.get('order-1')).toBe('2026-10-13T11:30:00.000Z');
    expect(sentAt.size).toBe(1);
  });
});
