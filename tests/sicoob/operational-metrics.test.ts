import { describe, expect, it } from "vitest";
import {
  deriveProductRecurrenceSignals,
  deriveSellerOrderMetrics,
  deduplicateCompletedOrders,
  formatMeasuredCurrency,
  SAVINGS_NOT_MEASURED,
} from "@/lib/sicoob/operationalMetrics";

describe("métricas operacionais Sicoob", () => {
  it("classifica pedidos do vendedor e soma somente valores observados", () => {
    expect(deriveSellerOrderMetrics([
      { status: "draft", total_amount: 100 },
      { status: "waiting_approval", total_amount: 200 },
      { status: "confirmed", total_amount: 300 },
      { status: "completed", total_amount: 400 },
      { status: "rejected", total_amount: 500 },
      { status: "cancelled", total_amount: 600 },
    ])).toEqual({
      total: 6,
      waiting: 2,
      approved: 2,
      rejected: 1,
      measuredAmount: 700,
    });
  });

  it("não apresenta zero como medição quando não existe amostra", () => {
    expect(formatMeasuredCurrency(0, 0, (value) => `R$ ${value}`)).toBe("Sem dados");
    expect(formatMeasuredCurrency(0, 1, (value) => `R$ ${value}`)).toBe("R$ 0");
    expect(SAVINGS_NOT_MEASURED).toContain("preço de referência");
  });

  it("exige amostra mínima e recorrência em pedidos distintos", () => {
    const orders = [
      { id: "o1", created_at: "2026-01-01T00:00:00Z" },
      { id: "o2", created_at: "2026-02-01T00:00:00Z" },
    ];
    const items = [
      { order_id: "o1", product_name: "Caneca", quantity: 10 },
      { order_id: "o1", product_name: "caneca", quantity: 5 },
      { order_id: "o2", product_name: "Caneca", quantity: 20 },
    ];

    expect(deriveProductRecurrenceSignals(orders, items)).toEqual([]);
  });

  it("calcula frequência factual, quantidade e última observação sem probabilidade inferida", () => {
    const orders = [
      { id: "o1", created_at: "2026-01-01T00:00:00Z" },
      { id: "o2", created_at: "2026-02-01T00:00:00Z" },
      { id: "o3", created_at: "2026-03-01T00:00:00Z" },
      { id: "o4", created_at: "2026-04-01T00:00:00Z" },
    ];
    const items = [
      { order_id: "o1", product_name: "Caneca", quantity: 10 },
      { order_id: "o1", product_name: "caneca", quantity: 5 },
      { order_id: "o3", product_name: "Caneca", quantity: 20 },
      { order_id: "o2", product_name: "Caderno", quantity: 2 },
      { order_id: "o4", product_name: "Caderno", quantity: 3 },
      { order_id: "fora", product_name: "Produto inválido", quantity: 99 },
    ];

    expect(deriveProductRecurrenceSignals(orders, items)).toEqual([
      {
        name: "Caneca",
        orderOccurrences: 2,
        totalQuantity: 35,
        sampleSize: 4,
        lastObservedAt: "2026-03-01T00:00:00Z",
      },
      {
        name: "Caderno",
        orderOccurrences: 2,
        totalQuantity: 5,
        sampleSize: 4,
        lastObservedAt: "2026-04-01T00:00:00Z",
      },
    ]);
  });

  it("conta um pedido concluído uma única vez e preserva o evento mais recente", () => {
    expect(deduplicateCompletedOrders([
      { order_id: "o1", created_at: "2026-01-01T10:00:00Z", total_amount: 100 },
      { order_id: "o1", created_at: "2026-01-02T10:00:00Z", total_amount: 120 },
      { order_id: "o2", created_at: "2026-01-03T10:00:00Z", total_amount: null },
      { order_id: null, created_at: "2026-01-04T10:00:00Z", total_amount: 999 },
    ])).toEqual([
      { id: "o1", completed_at: "2026-01-02T10:00:00Z", total_amount: 120 },
      { id: "o2", completed_at: "2026-01-03T10:00:00Z", total_amount: 0 },
    ]);
  });
});
