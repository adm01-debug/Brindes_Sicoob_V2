import { describe, expect, it } from 'vitest';

import { calculatePurchasingMetrics } from '@/pages/GestorCompras';
import type { OrderRow } from '@/types/orders';

function order(status: OrderRow['status'], total: number, createdAt: string): OrderRow {
  return { status, total, created_at: createdAt } as OrderRow;
}

describe('métricas reais da gestão de compras', () => {
  const now = new Date('2026-10-13T12:00:00.000Z');

  it('calcula pendências, SLA e totais a partir dos pedidos do escopo', () => {
    const pending = {
      count: 2,
      data: [
        order('enviado_gestor', 1_000, '2026-10-13T08:00:00.000Z'),
        order('enviado_gestor', 2_000, '2026-10-11T08:00:00.000Z'),
      ],
    };
    const monthly = {
      count: 4,
      data: [
        order('rascunho', 500, '2026-10-02T08:00:00.000Z'),
        order('aprovado_gestor', 1_000, '2026-10-03T08:00:00.000Z'),
        order('em_producao', 2_000, '2026-10-04T08:00:00.000Z'),
        order('cancelado', 7_000, '2026-10-05T08:00:00.000Z'),
      ],
    };

    expect(calculatePurchasingMetrics(pending, monthly, now)).toEqual({
      pendingCount: 2,
      slaPercent: 50,
      monthlyTotal: 3_500,
      approvedTotal: 3_000,
    });
  });

  it('não apresenta agregado parcial como se cobrisse o universo', () => {
    const truncated = {
      count: 1_001,
      data: [order('enviado_gestor', 1_000, '2026-10-13T08:00:00.000Z')],
    };

    expect(calculatePurchasingMetrics(truncated, truncated, now)).toEqual({
      pendingCount: 1_001,
      slaPercent: null,
      monthlyTotal: null,
      approvedTotal: null,
    });
  });
});
