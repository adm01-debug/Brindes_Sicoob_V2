/**
 * Hook that derives visual badges from market intelligence data + catalog flags.
 * Uses real data from mv_product_intelligence + mv_stock_velocity.
 * An empty materialized view produces no market badge.
 * Also incorporates catalog flags (featured, newArrival, onSale) from product data.
 */
import { useCallback, useMemo } from 'react';
import { useProductIntelligenceData, useStockVelocity } from '@/hooks/useStockHistory';

export type IntelligenceBadgeType =
  | 'best-seller'   // ABC A
  | 'popular'       // ABC B
  | 'normal'        // ABC C
  | 'emergente'     // trend > 1.3
  | 'last-units'    // low stock + high velocity (stockout risk)
  | 'featured'      // catalog: product.featured
  | 'new-arrival'   // catalog: product.newArrival
  | 'on-sale';      // catalog: product.onSale

export interface IntelligenceBadge {
  type: IntelligenceBadgeType;
  label: string;
  emoji: string;
  tooltip: string;
}

/** Catalog flags from the product record */
export interface CatalogFlags {
  featured?: boolean;
  newArrival?: boolean;
  onSale?: boolean;
  lowStock?: boolean;  // stockStatus === "low-stock"
  stock?: number;
}

export interface ProductIntelligenceBadgesResult {
  badges: IntelligenceBadge[];
  turnoverScore: number | null;
  demandLevel: 'muito-alta' | 'alta' | 'moderada' | 'baixa' | null;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  isEmpty: boolean;
  hasMarketData: boolean;
  retry: () => Promise<void>;
}

function catalogBadges(flags: CatalogFlags | undefined) {
  const badges: IntelligenceBadge[] = [];
  if (flags?.featured) badges.push({ type: 'featured', label: 'Destaque', emoji: '✨', tooltip: 'Produto em destaque no catálogo' });
  if (flags?.newArrival) badges.push({ type: 'new-arrival', label: 'Novidade', emoji: '🆕', tooltip: 'Produto adicionado recentemente ao catálogo' });
  if (flags?.onSale) badges.push({ type: 'on-sale', label: 'Promoção', emoji: '🏷️', tooltip: 'Produto com preço promocional' });
  return badges;
}

function classificationBadge(classification: string): IntelligenceBadge {
  if (classification === 'A') return { type: 'best-seller', label: 'Best-Seller', emoji: '🔥', tooltip: 'Classe A — um dos produtos mais vendidos do mercado' };
  if (classification === 'B') return { type: 'popular', label: 'Popular', emoji: '⚡', tooltip: 'Classe B — boa tração comercial' };
  return { type: 'normal', label: 'Normal', emoji: '📦', tooltip: 'Classe C — volume regular de vendas' };
}

function demandLevel(avgDaily: number): ProductIntelligenceBadgesResult['demandLevel'] {
  if (avgDaily >= 20) return 'muito-alta';
  if (avgDaily >= 10) return 'alta';
  if (avgDaily >= 3) return 'moderada';
  return 'baixa';
}

function finiteTurnoverScore(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

type IntelligenceData = NonNullable<ReturnType<typeof useProductIntelligenceData>["data"]>;
type VelocityData = NonNullable<ReturnType<typeof useStockVelocity>["data"]>;

function bestVelocity(velocities: VelocityData): VelocityData[number] | null {
  const first = velocities[0];
  if (!first) return null;
  return velocities.reduce((best, value) => (
    value.avg_daily_depletion_7d > (best?.avg_daily_depletion_7d ?? 0) ? value : best
  ), first);
}

function addMarketBadges(
  badges: IntelligenceBadge[],
  intelligence: IntelligenceData,
  velocity: VelocityData[number] | null,
) {
  badges.push(classificationBadge(intelligence.abc_classification));
  const trend = velocity?.velocity_trend;
  if (typeof trend === 'number' && trend > 1.3) {
    badges.push({ type: 'emergente', label: 'Emergente', emoji: '🚀', tooltip: 'Vendas acelerando — tendência de crescimento > 30%' });
  }
  if (intelligence.is_stockout_risk && intelligence.total_current_stock > 0) {
    badges.push({ type: 'last-units', label: 'Últimas Unidades', emoji: '⚠️', tooltip: 'Estoque baixo com alta velocidade de venda — risco real de ruptura' });
  }
}

function buildBadgeResult(
  intelligence: IntelligenceData | null | undefined,
  velocity: VelocityData | undefined,
  ...state: [catalogFlags: CatalogFlags | undefined, isLoading: boolean]
): Omit<ProductIntelligenceBadgesResult, 'isError' | 'isFetching' | 'isEmpty' | 'hasMarketData' | 'retry'> {
  const [catalogFlags, isLoading] = state;
  const badges = catalogBadges(catalogFlags);
  if (!intelligence) {
    return { badges, turnoverScore: null, demandLevel: null, isLoading };
  }
  const velocityPeak = bestVelocity(velocity ?? []);
  addMarketBadges(badges, intelligence, velocityPeak);
  const avgDaily = velocityPeak?.avg_daily_depletion_7d ?? intelligence.avg_velocity_7d ?? 0;
  return {
    badges,
    turnoverScore: finiteTurnoverScore(intelligence.turnover_score),
    demandLevel: demandLevel(avgDaily),
    isLoading,
  };
}

export function useProductIntelligenceBadges(productId?: string, catalogFlags?: CatalogFlags): ProductIntelligenceBadgesResult {
  const intelligenceQuery = useProductIntelligenceData(productId);
  const velocityQuery = useStockVelocity(productId);
  const { data: intelligence, isLoading: loadingIntel } = intelligenceQuery;
  const { data: velocity, isLoading: loadingVel } = velocityQuery;
  const isError = intelligenceQuery.isError || velocityQuery.isError;
  const isFetching = intelligenceQuery.isFetching || velocityQuery.isFetching;
  const hasMarketData = Boolean(intelligence);
  const isEmpty = Boolean(productId) && !loadingIntel && !loadingVel && !isError && !intelligence && !velocity?.length;
  const refetchIntel = intelligenceQuery.refetch;
  const refetchVelocity = velocityQuery.refetch;
  const retry = useCallback(async () => {
    await Promise.all([refetchIntel(), refetchVelocity()]);
  }, [refetchIntel, refetchVelocity]);

  return useMemo(
    () => ({
      ...buildBadgeResult(intelligence, velocity, catalogFlags, loadingIntel || loadingVel),
      isError,
      isFetching,
      isEmpty,
      hasMarketData,
      retry,
    }),
    [intelligence, velocity, loadingIntel, loadingVel, catalogFlags, isError, isFetching, isEmpty, hasMarketData, retry],
  );
}
