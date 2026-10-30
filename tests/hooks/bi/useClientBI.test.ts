import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ClientOrdersHistory } from "@/hooks/useClientOrdersHistory";

const { useClientOrdersHistory } = vi.hoisted(() => ({ useClientOrdersHistory: vi.fn() }));

vi.mock("@/hooks/useClientOrdersHistory", () => ({ useClientOrdersHistory }));

import { useClientBI } from "@/hooks/bi/useClientBI";

describe("useClientBI", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an explicit insufficient-data state instead of invented KPIs", () => {
    useClientOrdersHistory.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    const { result } = renderHook(() => useClientBI("client-empty"));

    expect(result.current.dataStatus).toBe("insufficient");
    expect(result.current.hasData).toBe(false);
    expect(result.current.isMock).toBe(false);
    expect(result.current).toMatchObject({
      ltv: 0,
      avgTicket: 0,
      ordersCount: 0,
      topCategories: [],
      recentOrders: [],
      delta: { hasPreviousData: false },
    });
  });

  it("preserves real order aggregates without injecting simulated categories", () => {
    const data: ClientOrdersHistory = {
      orders: [
        { order_number: "PED-2", created_at: "2026-10-20T00:00:00.000Z", total: 300, status: "concluido", notes: null },
        { order_number: "PED-1", created_at: "2026-10-10T00:00:00.000Z", total: 100, status: "concluido", notes: "Pedido real" },
      ] as ClientOrdersHistory["orders"],
      ordersCount: 2,
      totalLtv: 400,
      avgTicket: 200,
      lastOrderAt: "2026-10-20T00:00:00.000Z",
    };
    useClientOrdersHistory.mockReturnValue({ data, isLoading: false, isError: false });

    const { result } = renderHook(() => useClientBI("client-real"));

    expect(result.current.dataStatus).toBe("available");
    expect(result.current.hasData).toBe(true);
    expect(result.current.ltv).toBe(400);
    expect(result.current.ordersCount).toBe(2);
    expect(result.current.topCategories).toEqual([]);
    expect(result.current.recentOrders.map((order) => order.total)).toEqual([300, 100]);
  });

  it("does not classify an unavailable request as an empty real sample", () => {
    useClientOrdersHistory.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    const { result } = renderHook(() => useClientBI("client-error"));

    expect(result.current.dataStatus).toBe("unavailable");
    expect(result.current.hasData).toBe(false);
  });
});
