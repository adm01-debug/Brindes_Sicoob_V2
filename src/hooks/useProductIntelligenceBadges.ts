/** Selos de catálogo e inteligência sustentados por dados reais. */
import { useMemo } from 'react';
import {
  useProductIntelligenceData,
  useStockVelocity,
  type ProductIntelligenceData,
  type StockVelocity,
} from '@/hooks/useStockHistory';

export type IntelligenceBadgeType =
  | 'best-seller' | 'popular' | 'normal' | 'emergente' | 'last-units'
  | 'featured' | 'new-arrival' | 'on-sale';

export interface IntelligenceBadge {
  type: IntelligenceBadgeType;
  label: string;
  emoji: string;
  tooltip: string;
}

export interface CatalogFlags {
  featured?: boolean;
  newArrival?: boolean;
  onSale?: boolean;
}

export interface ProductIntelligenceBadgesResult {
  badges: IntelligenceBadge[];
  turnoverScore: number | null;
  demandLevel: 'muito-alta' | 'alta' | 'moderada' | 'baixa' | null;
  isLoading: boolean;
}

function catalogBadges(flags?: CatalogFlags): IntelligenceBadge[] {
  const badges: IntelligenceBadge[] = [];
  if (flags?.featured) badges.push({ type: 'featured', label: 'Destaque', emoji: '✨', tooltip: 'Produto em destaque no catálogo' });
  if (flags?.newArrival) badges.push({ type: 'new-arrival', label: 'Novidade', emoji: '🆕', tooltip: 'Produto adicionado recentemente ao catálogo' });
  if (flags?.onSale) badges.push({ type: 'on-sale', label: 'Promoção', emoji: '🏷️', tooltip: 'Produto com preço promocional' });
  return badges;
}

function highestVelocity(velocities: StockVelocity[]): StockVelocity | null {
  let result: StockVelocity | null = null;
  for (const velocity of velocities) {
    if (!result || velocity.avg_daily_depletion_7d > result.avg_daily_depletion_7d) result = velocity;
  }
  return result;
}

function appendMarketBadges(badges: IntelligenceBadge[], intelligence: ProductIntelligenceData, velocity: StockVelocity | null) {
  const classification = intelligence.abc_classification;
  if (classification === 'A') badges.push({ type: 'best-seller', label: 'Best-Seller', emoji: '🔥', tooltip: 'Classe A — um dos produtos mais vendidos do mercado' });
  else if (classification === 'B') badges.push({ type: 'popular', label: 'Popular', emoji: '⚡', tooltip: 'Classe B — boa tração comercial' });
  else badges.push({ type: 'normal', label: 'Normal', emoji: '📦', tooltip: 'Classe C — volume regular de vendas' });
  if (velocity && velocity.velocity_trend > 1.3) badges.push({ type: 'emergente', label: 'Emergente', emoji: '🚀', tooltip: 'Vendas acelerando — tendência de crescimento > 30%' });
  if (intelligence.is_stockout_risk && intelligence.total_current_stock > 0) badges.push({ type: 'last-units', label: 'Últimas Unidades', emoji: '⚠️', tooltip: 'Estoque baixo com alta velocidade de venda — risco real de ruptura' });
}

function demandLevel(velocity: StockVelocity | null, intelligence: ProductIntelligenceData): ProductIntelligenceBadgesResult['demandLevel'] {
  const average = velocity?.avg_daily_depletion_7d ?? intelligence.avg_velocity_7d;
  if (average >= 20) return 'muito-alta';
  if (average >= 10) return 'alta';
  if (average >= 3) return 'moderada';
  return 'baixa';
}

export function deriveProductIntelligenceBadges(
  intelligence: ProductIntelligenceData | null | undefined,
  velocities: StockVelocity[] | undefined,
  flags: CatalogFlags | undefined,
  isLoading: boolean,
): ProductIntelligenceBadgesResult {
  const badges = catalogBadges(flags);
  if (!intelligence) return { badges, turnoverScore: null, demandLevel: null, isLoading };
  const velocity = highestVelocity(velocities ?? []);
  appendMarketBadges(badges, intelligence, velocity);
  return {
    badges,
    turnoverScore: Number.isFinite(intelligence.turnover_score) ? Math.round(intelligence.turnover_score) : null,
    demandLevel: demandLevel(velocity, intelligence),
    isLoading,
  };
}

export function useProductIntelligenceBadges(productId?: string, catalogFlags?: CatalogFlags): ProductIntelligenceBadgesResult {
  const { data: intelligence, isLoading: loadingIntelligence } = useProductIntelligenceData(productId);
  const { data: velocities, isLoading: loadingVelocities } = useStockVelocity(productId);
  return useMemo(
    () => deriveProductIntelligenceBadges(intelligence, velocities, catalogFlags, loadingIntelligence || loadingVelocities),
    [catalogFlags, intelligence, loadingIntelligence, loadingVelocities, velocities],
  );
}
