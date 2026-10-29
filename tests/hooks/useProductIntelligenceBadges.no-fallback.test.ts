import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductIntelligenceData, StockVelocity } from "@/hooks/useStockHistory";
import { useProductIntelligenceBadges } from "@/hooks/useProductIntelligenceBadges";

const { intelligenceMock, velocityMock } = vi.hoisted(() => ({
  intelligenceMock: vi.fn(),
  velocityMock: vi.fn(),
}));

vi.mock("@/hooks/useStockHistory", () => ({
  useProductIntelligenceData: intelligenceMock,
  useStockVelocity: velocityMock,
}));

describe("useProductIntelligenceBadges — sem inteligência sintética", () => {
  beforeEach(() => {
    intelligenceMock.mockReset().mockReturnValue({ data: null, isLoading: false });
    velocityMock.mockReset().mockReturnValue({ data: [], isLoading: false });
  });

  it("não anuncia best-seller, popularidade ou risco quando as views estão vazias", () => {
    const { result } = renderHook(() => useProductIntelligenceBadges("produto-1"));

    expect(result.current.badges).toEqual([]);
    expect(result.current.turnoverScore).toBeNull();
    expect(result.current.demandLevel).toBeNull();
    expect(result.current.isDemo).toBe(false);
  });

  it("preserva apenas os indicadores de catálogo explicitamente recebidos", () => {
    const { result } = renderHook(() => useProductIntelligenceBadges("produto-1", {
      featured: true,
      newArrival: true,
      onSale: false,
    }));

    expect(result.current.badges.map((badge) => badge.type)).toEqual(["featured", "new-arrival"]);
  });

  it("deriva selos de mercado somente de métricas reais recebidas", () => {
    const intelligence: ProductIntelligenceData = {
      product_id: "produto-1",
      supplier_count: 2,
      total_current_stock: 8,
      total_depleted_7d: 30,
      total_depleted_30d: 100,
      total_depleted_90d: 250,
      total_restocked_30d: 0,
      avg_velocity_7d: 4,
      avg_velocity_30d: 3,
      max_velocity_trend: 1.4,
      min_days_to_stockout: 2,
      turnover_score: 90,
      abc_classification: "A",
      is_hot_product: true,
      is_stockout_risk: true,
      is_stagnant: false,
      is_negotiation_opportunity: false,
      has_frequent_restock: false,
    };
    const velocity: StockVelocity = {
      variant_supplier_source_id: "source-1",
      supplier_id: "supplier-1",
      product_id: "produto-1",
      variant_id: "variant-1",
      current_stock: 8,
      avg_daily_depletion_7d: 4,
      avg_daily_depletion_30d: 3,
      avg_daily_depletion_90d: 2,
      velocity_trend: 1.4,
      days_to_stockout: 2,
      total_depleted_7d: 30,
      total_depleted_30d: 100,
      total_depleted_90d: 250,
      total_restocked_30d: 0,
      restock_events_30d: 0,
      avg_days_between_restocks: null,
      price_changes_30d: 0,
      active_days_7d: 7,
      active_days_30d: 30,
      active_days_90d: 90,
    };
    intelligenceMock.mockReturnValue({ data: intelligence, isLoading: false });
    velocityMock.mockReturnValue({ data: [velocity], isLoading: false });

    const { result } = renderHook(() => useProductIntelligenceBadges("produto-1"));

    expect(result.current.badges.map((badge) => badge.type)).toEqual(["best-seller", "emergente", "last-units"]);
    expect(result.current.turnoverScore).toBe(90);
    expect(result.current.demandLevel).toBe("moderada");
  });
});
