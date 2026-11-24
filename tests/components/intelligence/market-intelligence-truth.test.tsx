import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ market: vi.fn(), supplierNames: vi.fn() }));

vi.mock("@/hooks/useMarketIntelligenceMacro", () => ({
  useMarketIntelligenceMacro: mocks.market,
}));
vi.mock("@/hooks/useSupplierNames", () => ({
  useSupplierNames: mocks.supplierNames,
}));

import { MarketIntelligenceChart } from "@/components/intelligence/MarketIntelligenceChart";

describe("inteligencia de mercado sem dados reais", () => {
  it("mostra ausencia de movimentacoes em vez de inventar mercado", () => {
    mocks.market.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mocks.supplierNames.mockReturnValue({ data: new Map<string, string>() });

    render(<MarketIntelligenceChart />);

    expect(screen.getByText("Sem movimentações de mercado no período")).toBeTruthy();
    expect(screen.queryByText(/dados ilustrativos/i)).toBeNull();
    expect(screen.queryByText("Brasil Brindes")).toBeNull();
    expect(screen.queryByText("Master Promo")).toBeNull();
    expect(screen.queryByText("Premium Gifts")).toBeNull();
  });

  it("mostra ausencia de movimentacoes quando o periodo volta vazio", () => {
    mocks.market.mockReturnValue({
      data: {
        daily: [],
        kpis: {
          totalDepleted7d: 0,
          totalDepleted30d: 0,
          totalRestocked30d: 0,
          totalCurrentStock: 0,
          avgDailyDepletion: 0,
          supplierCount: 0,
          topDepletionDay: null,
        },
        suppliers: [],
        supplierIds: [],
      },
      isLoading: false,
      error: null,
    });
    mocks.supplierNames.mockReturnValue({ data: new Map<string, string>() });

    render(<MarketIntelligenceChart />);

    expect(screen.getByText("Sem movimentações de mercado no período")).toBeTruthy();
  });
});
