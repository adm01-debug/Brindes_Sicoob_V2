import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientOrdersHistory } from "@/hooks/useClientOrdersHistory";
import { useClientBI } from "@/hooks/bi/useClientBI";

const { useClientOrdersHistoryMock } = vi.hoisted(() => ({
  useClientOrdersHistoryMock: vi.fn(),
}));

vi.mock("@/hooks/useClientOrdersHistory", () => ({
  useClientOrdersHistory: useClientOrdersHistoryMock,
}));

describe("useClientBI — ausência de fallback sintético", () => {
  beforeEach(() => {
    useClientOrdersHistoryMock.mockReset();
  });

  it("retorna estado vazio quando não há histórico, sem popular números de demonstração", () => {
    useClientOrdersHistoryMock.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    const { result } = renderHook(() => useClientBI("cliente-1"));

    expect(result.current).toMatchObject({
      isMock: false,
      hasData: false,
      hasError: false,
      ltv: 0,
      avgTicket: 0,
      ordersCount: 0,
      topCategories: [],
      recentOrders: [],
      delta: { ltvDeltaPct: 0, avgTicketDeltaPct: 0, ordersCountDeltaPct: 0, hasPreviousData: false },
    });
  });

  it("preserva o estado de erro sem convertê-lo em um cliente fictício", () => {
    useClientOrdersHistoryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    const { result } = renderHook(() => useClientBI("cliente-1"));

    expect(result.current.hasError).toBe(true);
    expect(result.current.hasData).toBe(false);
    expect(result.current.ltv).toBe(0);
    expect(result.current.recentOrders).toEqual([]);
  });

  it("usa os totais recebidos e não inventa categorias sem relação confirmada", () => {
    const data = {
      orders: [{ order_number: "PED-1", created_at: "2026-10-28T12:00:00.000Z", total: 750, status: "confirmado", notes: "Pedido real" }],
      ordersCount: 1,
      totalLtv: 750,
      avgTicket: 750,
      lastOrderAt: "2026-10-28T12:00:00.000Z",
    } as unknown as ClientOrdersHistory;
    useClientOrdersHistoryMock.mockReturnValue({ data, isLoading: false, isError: false });

    const { result } = renderHook(() => useClientBI("cliente-1"));

    expect(result.current).toMatchObject({ isMock: false, hasData: true, hasError: false, ltv: 750, avgTicket: 750, ordersCount: 1 });
    expect(result.current.topCategories).toEqual([]);
    expect(result.current.recentOrders[0]).toMatchObject({ id: "PED-1", total: 750, productPreview: "Pedido real" });
  });
});
