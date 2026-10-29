/**
 * useComparisonScore — Score ponderado para decidir o melhor produto na comparação.
 *
 * Pesos default (somam 100):
 *  - price (35) — quanto menor melhor
 *  - stock (20) — quanto maior melhor
 *  - minQuantity (15) — quanto menor melhor
 *  - colorVariety (10) — quanto mais cores melhor
 *  - verifiedSupplier (10) — bônus se verificado
 *  - leadTime (10) — quanto menor melhor (somente prazo real do fornecedor)
 *
 * Pesos podem ser sobrescritos pelo consumidor (popover de ajuste).
 */
import { useMemo } from "react";
import type { Product } from "@/types/product-catalog";

type ComparisonProduct = Product & {
  supplier: Product["supplier"] & { verified?: boolean; isVerified?: boolean };
};

export interface ComparisonScoreWeights {
  price: number;
  stock: number;
  minQuantity: number;
  colorVariety: number;
  verifiedSupplier: number;
  leadTime: number;
}

export const DEFAULT_SCORE_WEIGHTS: ComparisonScoreWeights = {
  price: 35,
  stock: 20,
  minQuantity: 15,
  colorVariety: 10,
  verifiedSupplier: 10,
  leadTime: 10,
};

export interface ProductScore {
  productId: string;
  total: number; // 0..100
  breakdown: Record<keyof ComparisonScoreWeights, number>;
  isWinner: boolean;
  rank: number;
}

function normalizeLowerBetter(value: number, min: number, max: number): number {
  if (max === min) return 1;
  return 1 - (value - min) / (max - min);
}

function normalizeHigherBetter(value: number, min: number, max: number): number {
  if (max === min) return 1;
  return (value - min) / (max - min);
}

function metricAt(values: number[], index: number, fallback: number): number {
  return values[index] ?? fallback;
}

export function useComparisonScore(
  products: ComparisonProduct[],
  weights: ComparisonScoreWeights = DEFAULT_SCORE_WEIGHTS
): ProductScore[] {
  return useMemo(() => {
    if (!products || products.length === 0) return [];

    const prices = products.map(p => Number(p.price ?? 0));
    const stocks = products.map(p => Number(p.stock ?? 0));
    const mins = products.map(p => Number(p.minQuantity ?? 1));
    const colorCounts = products.map(p => (p.colors?.length ?? 0));
    const hasCompleteLeadTime = products.every(
      (product) => typeof product.leadTimeDays === "number" && Number.isFinite(product.leadTimeDays),
    );
    const leadTimes = products.map(p => p.leadTimeDays ?? 0);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minStock = Math.min(...stocks);
    const maxStock = Math.max(...stocks);
    const minMin = Math.min(...mins);
    const maxMin = Math.max(...mins);
    const minColors = Math.min(...colorCounts);
    const maxColors = Math.max(...colorCounts);
    const minLead = Math.min(...leadTimes);
    const maxLead = Math.max(...leadTimes);

    const effectiveWeights = hasCompleteLeadTime ? weights : { ...weights, leadTime: 0 };
    const totalWeight = Object.values(effectiveWeights).reduce((a, b) => a + b, 0) || 1;

    const scores = products.map((p, i) => {
      const verified = Boolean(p.supplier?.verified ?? p.supplier?.isVerified ?? false);
      const breakdown: Record<keyof ComparisonScoreWeights, number> = {
        price: normalizeLowerBetter(metricAt(prices, i, 0), minPrice, maxPrice) * effectiveWeights.price,
        stock: normalizeHigherBetter(metricAt(stocks, i, 0), minStock, maxStock) * effectiveWeights.stock,
        minQuantity: normalizeLowerBetter(metricAt(mins, i, 1), minMin, maxMin) * effectiveWeights.minQuantity,
        colorVariety: normalizeHigherBetter(colorCounts[i] ?? 0, minColors, maxColors) * effectiveWeights.colorVariety,
        verifiedSupplier: (verified ? 1 : 0.4) * effectiveWeights.verifiedSupplier,
        leadTime: hasCompleteLeadTime
          ? normalizeLowerBetter(metricAt(leadTimes, i, 0), minLead, maxLead) * effectiveWeights.leadTime
          : 0,
      };
      const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
      return {
        productId: String(p.id),
        total: Math.round((total / totalWeight) * 100),
        breakdown,
        isWinner: false,
        rank: 0,
      } as ProductScore;
    });

    // Determina vencedor + rank
    const sorted = [...scores].sort((a, b) => b.total - a.total);
    sorted.forEach((s, idx) => {
      const original = scores.find(x => x.productId === s.productId);
      if (!original) return;
      original.rank = idx + 1;
      original.isWinner = idx === 0;
    });

    return scores;
  }, [products, weights]);
}
