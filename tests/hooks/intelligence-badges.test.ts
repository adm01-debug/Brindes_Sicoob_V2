import { describe, expect, it } from 'vitest';
import { buildBadgeResult } from '@/hooks/useProductIntelligenceBadges';
import type { ProductIntelligenceData, StockVelocity } from '@/hooks/useStockHistory';

const intelligence: ProductIntelligenceData = {
  product_id: 'product-1',
  supplier_count: 2,
  total_current_stock: 30,
  total_depleted_7d: 70,
  total_depleted_30d: 210,
  total_depleted_90d: 500,
  total_restocked_30d: 100,
  avg_velocity_7d: 10,
  avg_velocity_30d: 7,
  max_velocity_trend: 1,
  min_days_to_stockout: 5,
  turnover_score: 86,
  abc_classification: 'A',
  is_hot_product: true,
  is_stockout_risk: true,
  is_stagnant: false,
  is_negotiation_opportunity: false,
  has_frequent_restock: true,
};

const velocity: StockVelocity = {
  variant_supplier_source_id: 'source-1',
  supplier_id: 'supplier-1',
  product_id: 'product-1',
  variant_id: 'variant-1',
  current_stock: 30,
  avg_daily_depletion_7d: 12,
  avg_daily_depletion_30d: 8,
  avg_daily_depletion_90d: 6,
  velocity_trend: 1.5,
  days_to_stockout: 3,
  total_depleted_7d: 84,
  total_depleted_30d: 240,
  total_depleted_90d: 540,
  total_restocked_30d: 100,
  restock_events_30d: 2,
  avg_days_between_restocks: 15,
  price_changes_30d: 1,
  active_days_7d: 7,
  active_days_30d: 30,
  active_days_90d: 90,
};

describe('buildBadgeResult', () => {
  it('does not invent market badges or metrics when intelligence is absent', () => {
    const result = buildBadgeResult(undefined, undefined, undefined, false);

    expect(result).toMatchObject({
      badges: [],
      turnoverScore: null,
      demandLevel: null,
      isDemo: false,
    });
  });

  it('preserves catalog-controlled badges while omitting unavailable market intelligence', () => {
    const result = buildBadgeResult(undefined, undefined, {
      featured: true,
      newArrival: true,
      onSale: true,
    }, false);

    expect(result.badges.map(({ type }) => type)).toEqual(['featured', 'new-arrival', 'on-sale']);
    expect(result.turnoverScore).toBeNull();
    expect(result.demandLevel).toBeNull();
    expect(result.isDemo).toBe(false);
  });

  it('derives market badges and metrics from real intelligence and velocity', () => {
    const result = buildBadgeResult(intelligence, [velocity], { featured: true }, false);

    expect(result.badges.map(({ type }) => type)).toEqual([
      'featured', 'best-seller', 'emergente', 'last-units',
    ]);
    expect(result.turnoverScore).toBe(86);
    expect(result.demandLevel).toBe('alta');
  });

  it('keeps real intelligence badges when velocity data is unavailable', () => {
    const result = buildBadgeResult(intelligence, [], undefined, true);

    expect(result.badges.map(({ type }) => type)).toEqual(['best-seller', 'last-units']);
    expect(result.turnoverScore).toBe(86);
    expect(result.demandLevel).toBe('alta');
    expect(result.isLoading).toBe(true);
  });
});
