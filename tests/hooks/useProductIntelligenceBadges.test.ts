import { describe, expect, it } from 'vitest';
import { deriveProductIntelligenceBadges } from '@/hooks/useProductIntelligenceBadges';
import type { ProductIntelligenceData } from '@/hooks/useStockHistory';

const intelligence: ProductIntelligenceData = {
  product_id: 'product-a', supplier_count: 1, total_current_stock: 100,
  total_depleted_7d: 20, total_depleted_30d: 80, total_depleted_90d: 200,
  total_restocked_30d: 120, avg_velocity_7d: 4, avg_velocity_30d: 3,
  max_velocity_trend: 1, min_days_to_stockout: 20, turnover_score: 84,
  abc_classification: 'A', is_hot_product: false, is_stockout_risk: false,
  is_stagnant: false, is_negotiation_opportunity: false, has_frequent_restock: false,
};

describe('deriveProductIntelligenceBadges', () => {
  it('não inventa classificação quando a visão de inteligência está vazia', () => {
    const result = deriveProductIntelligenceBadges(null, [], { featured: true }, false);

    expect(result.badges.map((badge) => badge.type)).toEqual(['featured']);
    expect(result.turnoverScore).toBeNull();
    expect(result.demandLevel).toBeNull();
  });

  it('exibe classificação apenas quando ela vem da visão de inteligência', () => {
    const result = deriveProductIntelligenceBadges(intelligence, [], undefined, false);

    expect(result.badges.map((badge) => badge.type)).toEqual(['best-seller']);
    expect(result.turnoverScore).toBe(84);
    expect(result.demandLevel).toBe('moderada');
  });
});
