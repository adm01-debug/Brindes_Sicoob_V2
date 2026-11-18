/**
 * Regras do SLA de 24h e dos totais do mês da gestão de compras.
 *
 * Recupera os cenários da PR #119. O que eles travam não é a aritmética: é a
 * recusa em apresentar número parcial ou estimado como se fosse medido — e,
 * depois da revisão, a recusa em chamar de "aprovado em 24h" o pedido que
 * ninguém aprovou.
 */
import { describe, expect, it } from 'vitest';

import {
  calculatePurchasingMetrics,
  mapApprovalDecisions,
  metricLabel,
  type PurchasingOrder,
} from '@/lib/orders/purchasing-sla';
import type { OrderStatus } from '@/types/sicoob/orders';

function order(id: string, status: OrderStatus, total: number, createdAt: string): PurchasingOrder {
  return { id, status, total_amount: total, created_at: createdAt };
}

/** Par (entrou na fila, foi aprovado) com o intervalo em horas. */
function decisao(id: string, enviadoEm: string, horasAteAprovar: number) {
  const submittedAtMs = Date.parse(enviadoEm);
  return [id, { submittedAtMs, decidedAtMs: submittedAtMs + horasAteAprovar * 3_600_000 }] as const;
}

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
    // Dos dois aprovados, um foi decidido em 2h e o outro em 48h: 50%.
    const decisoes = new Map([
      decisao('order-4', '2026-10-03T08:00:00.000Z', 2),
      decisao('order-5', '2026-10-04T08:00:00.000Z', 48),
    ]);

    expect(calculatePurchasingMetrics(pendentes, doMes, decisoes)).toEqual({
      pendingCount: 2,
      slaPercent: 50,
      monthlyTotal: 3_500,
      approvedTotal: 3_000,
    });
  });

  it('fila recém-criada e nenhuma aprovação não viram 100%', () => {
    // O cálculo antigo media a idade dos pendentes: um mês em que ninguém
    // aprovou nada exibia "Aprovados em 24h: 100%".
    const pendentes = {
      count: 2,
      data: [
        order('order-1', 'waiting_approval', 1_000, '2026-10-13T11:00:00.000Z'),
        order('order-2', 'waiting_approval', 2_000, '2026-10-13T11:30:00.000Z'),
      ],
    };

    expect(calculatePurchasingMetrics(pendentes, pendentes, new Map()).slaPercent).toBeNull();
  });

  it('não apresenta agregado parcial quando a consulta trunca', () => {
    // 1.001 pedidos no banco, 1 linha devolvida: qualquer soma aqui seria uma
    // fração apresentada como total.
    const truncado = {
      count: 1_001,
      data: [order('order-1', 'confirmed', 1_000, '2026-10-13T08:00:00.000Z')],
    };

    expect(
      calculatePurchasingMetrics(truncado, truncado, new Map([decisao('order-1', '2026-10-13T08:00:00.000Z', 1)])),
    ).toEqual({
      pendingCount: 1_001,
      slaPercent: null,
      monthlyTotal: null,
      approvedTotal: null,
    });
  });

  it('aprovado sem carimbo de envio zera o SLA em vez de estimar', () => {
    const doMes = {
      count: 2,
      data: [
        order('order-1', 'confirmed', 1_000, '2026-10-03T08:00:00.000Z'),
        order('order-2', 'delivered', 1_000, '2026-10-04T08:00:00.000Z'),
      ],
    };

    const decisoes = new Map([decisao('order-1', '2026-10-03T08:00:00.000Z', 1)]);
    expect(calculatePurchasingMetrics(undefined, doMes, decisoes).slaPercent).toBeNull();
  });

  it('cancelado sai do total do mês e não conta como aprovado', () => {
    const doMes = {
      count: 2,
      data: [
        order('order-1', 'cancelled', 9_000, '2026-10-02T08:00:00.000Z'),
        order('order-2', 'delivered', 1_000, '2026-10-03T08:00:00.000Z'),
      ],
    };

    const metrics = calculatePurchasingMetrics(undefined, doMes, new Map());
    expect(metrics.monthlyTotal).toBe(1_000);
    expect(metrics.approvedTotal).toBe(1_000);
  });
});

describe('mapApprovalDecisions', () => {
  it('usa a entrada na fila imediatamente anterior à aprovação', () => {
    // Reenvio é comum: vale a última ida à fila antes do "sim", não a primeira.
    const decisoes = mapApprovalDecisions([
      { order_id: 'order-1', new_status: 'waiting_approval', created_at: '2026-10-10T10:00:00.000Z' },
      { order_id: 'order-1', new_status: 'draft', created_at: '2026-10-11T10:00:00.000Z' },
      { order_id: 'order-1', new_status: 'waiting_approval', created_at: '2026-10-13T10:00:00.000Z' },
      { order_id: 'order-1', new_status: 'confirmed', created_at: '2026-10-13T16:00:00.000Z' },
      { order_id: null, new_status: 'confirmed', created_at: '2026-10-13T11:45:00.000Z' },
    ]);

    const par = decisoes.get('order-1');
    expect(par?.submittedAtMs).toBe(Date.parse('2026-10-13T10:00:00.000Z'));
    expect(par?.decidedAtMs).toBe(Date.parse('2026-10-13T16:00:00.000Z'));
    expect(decisoes.size).toBe(1);
  });

  it.each([
    ['entrada antes', ['waiting_approval', 'confirmed']],
    ['aprovação antes', ['confirmed', 'waiting_approval']],
  ])('confirmação na mesma transação (%s) vira decisão em zero hora', (_rotulo, ordem) => {
    // `now()` é constante na transação: os dois eventos saem com o mesmo
    // carimbo e a ordem de retorno do Postgres não é garantida.
    const carimbo = '2026-10-13T10:00:00.000Z';
    const decisoes = mapApprovalDecisions(
      ordem.map((new_status) => ({ order_id: 'order-1', new_status, created_at: carimbo })),
    );

    const par = decisoes.get('order-1');
    expect(par?.submittedAtMs).toBe(Date.parse(carimbo));
    expect(par?.decidedAtMs).toBe(Date.parse(carimbo));
  });

  it('pedido ainda na fila não entra como decidido', () => {
    const decisoes = mapApprovalDecisions([
      { order_id: 'order-1', new_status: 'waiting_approval', created_at: '2026-10-13T10:00:00.000Z' },
    ]);

    expect(decisoes.size).toBe(0);
  });

  it('aprovação sem entrada na fila registrada é descartada, não estimada', () => {
    const decisoes = mapApprovalDecisions([
      { order_id: 'order-1', new_status: 'confirmed', created_at: '2026-10-13T16:00:00.000Z' },
    ]);

    expect(decisoes.size).toBe(0);
  });

  it('descarta evento com data inválida', () => {
    const decisoes = mapApprovalDecisions([
      { order_id: 'order-1', new_status: 'waiting_approval', created_at: 'data-quebrada' },
      { order_id: 'order-1', new_status: 'confirmed', created_at: '2026-10-13T16:00:00.000Z' },
    ]);

    expect(decisoes.size).toBe(0);
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
