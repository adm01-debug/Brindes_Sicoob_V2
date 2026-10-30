/**
 * useClientBI — orquestra estatísticas 360° do cliente usando apenas pedidos reais.
 */
import { useMemo } from "react";
import { useClientOrdersHistory } from "@/hooks/useClientOrdersHistory";

export interface PeriodDelta {
  ltvDeltaPct: number;
  avgTicketDeltaPct: number;
  ordersCountDeltaPct: number;
  hasPreviousData: boolean;
}

export interface ClientBI {
  dataStatus: "loading" | "unavailable" | "insufficient" | "available";
  hasData: boolean;
  isMock: boolean;
  ltv: number;
  avgTicket: number;
  ordersCount: number;
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  topCategories: Array<{ category: string; count: number; revenue: number }>;
  recentOrders: Array<{
    id: string;
    date: string;
    total: number;
    itemsCount: number;
    productPreview: string;
    isAnomaly: boolean;
    deviation: number; // z-score (σ)
  }>;
  /** Métricas restritas aos últimos 90 dias */
  current90d: { ltv: number; avgTicket: number; ordersCount: number };
  /** Métricas dos 90 dias anteriores (90-180d atrás) */
  previous90d: { ltv: number; avgTicket: number; ordersCount: number };
  /** Variação percentual current vs previous */
  delta: PeriodDelta;
  isLoading: boolean;
}

const DAY_MS = 86400000;

function pctDelta(current: number, previous: number): number {
  if (!previous || previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function useClientBI(clientId?: string): ClientBI {
  const { data, isLoading, isError } = useClientOrdersHistory(clientId);

  return useMemo(() => {
    if (!data || data.ordersCount === 0) {
      return {
        dataStatus: isLoading ? "loading" : isError ? "unavailable" : "insufficient",
        hasData: false,
        isMock: false,
        ltv: 0,
        avgTicket: 0,
        ordersCount: 0,
        topCategories: [],
        recentOrders: [],
        lastOrderDate: null,
        daysSinceLastOrder: null,
        current90d: { ltv: 0, avgTicket: 0, ordersCount: 0 },
        previous90d: { ltv: 0, avgTicket: 0, ordersCount: 0 },
        delta: {
          ltvDeltaPct: 0,
          avgTicketDeltaPct: 0,
          ordersCountDeltaPct: 0,
          hasPreviousData: false,
        },
        isLoading,
      };
    }

    const daysSince = data.lastOrderAt
      ? Math.floor((Date.now() - new Date(data.lastOrderAt).getTime()) / DAY_MS)
      : null;

    // Buckets temporais (90d / 90-180d)
    const now = Date.now();
    const cutCurrent = now - 90 * DAY_MS;
    const cutPrevious = now - 180 * DAY_MS;
    const valid = data.orders.filter((o) => o.status !== "cancelado");

    const inCurrent = valid.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= cutCurrent;
    });
    const inPrevious = valid.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= cutPrevious && t < cutCurrent;
    });

    const sumLtv = (arr: typeof valid) => arr.reduce((s, o) => s + (o.total ?? 0), 0);
    const cur = {
      ltv: sumLtv(inCurrent),
      ordersCount: inCurrent.length,
      avgTicket: inCurrent.length ? sumLtv(inCurrent) / inCurrent.length : 0,
    };
    const prev = {
      ltv: sumLtv(inPrevious),
      ordersCount: inPrevious.length,
      avgTicket: inPrevious.length ? sumLtv(inPrevious) / inPrevious.length : 0,
    };

    return {
      dataStatus: "available",
      hasData: true,
      isMock: false,
      ltv: data.totalLtv,
      avgTicket: data.avgTicket,
      ordersCount: data.ordersCount,
      lastOrderDate: data.lastOrderAt,
      daysSinceLastOrder: daysSince,
      // Sem categoria validada nos itens do pedido, não atribui preferência.
      topCategories: [],
      recentOrders: (() => {
        const totals = valid.map((o) => o.total ?? 0).filter((t) => t > 0);
        const mean = totals.length > 0 ? totals.reduce((s, v) => s + v, 0) / totals.length : 0;
        const variance =
          totals.length > 1
            ? totals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / totals.length
            : 0;
        const sigma = Math.sqrt(variance);
        return data.orders.slice(0, 5).map((o) => {
          const total = o.total ?? 0;
          const dev = sigma > 0 ? (total - mean) / sigma : 0;
          return {
            id: o.order_number,
            date: o.created_at,
            total,
            itemsCount: 1,
            productPreview: o.notes?.slice(0, 60) ?? "Pedido",
            isAnomaly: Math.abs(dev) > 2 && totals.length >= 4,
            deviation: Math.round(dev * 10) / 10,
          };
        });
      })(),
      current90d: cur,
      previous90d: prev,
      delta: {
        ltvDeltaPct: pctDelta(cur.ltv, prev.ltv),
        avgTicketDeltaPct: pctDelta(cur.avgTicket, prev.avgTicket),
        ordersCountDeltaPct: pctDelta(cur.ordersCount, prev.ordersCount),
        hasPreviousData: inPrevious.length > 0 && sumLtv(inPrevious) > 0,
      },
      isLoading,
    };
  }, [data, isError, isLoading]);
}
