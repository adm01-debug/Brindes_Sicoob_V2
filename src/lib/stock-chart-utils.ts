/**
 * Utilitários compartilhados entre StockHistoryChart e SupplierRiskPanel.
 * Elimina ~198 linhas de duplicação.
 */
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { IntelligenceFlag } from '@/hooks/useStockHistory';
import {
  Flame,
  AlertTriangle,
  Zap,
  Moon,
  DollarSign,
  RefreshCw,
  Star,
  Trophy,
  Eye,
} from 'lucide-react';

const DESTRUCTIVE_FLAG_COLORS = 'bg-destructive/15 text-destructive border-destructive/30';
const ACCENT_FLAG_COLORS = 'bg-accent/15 text-accent-foreground border-accent/30';

export function safeVelocityTrend(trend: number | null | undefined): number | null {
  if (trend === null || trend === undefined || !Number.isFinite(trend)) return null;
  return trend;
}

export function safeNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return value;
}

// ---------- Flag configs ----------

interface FlagConfig {
  icon: typeof Flame;
  label: string;
  colors: string;
  description: string;
}

/** Flags com foco COMERCIAL (página de produto) */
export const COMMERCIAL_FLAG_CONFIG: Record<IntelligenceFlag, FlagConfig> = {
  'hot-product': {
    icon: Flame,
    label: 'Sucesso no Mercado',
    colors: DESTRUCTIVE_FLAG_COLORS,
    description: 'Alta saída no fornecedor — seus concorrentes estão vendendo bastante',
  },
  'stockout-risk': {
    icon: Zap,
    label: 'Esgotando Rápido',
    colors: ACCENT_FLAG_COLORS,
    description: 'Demanda do mercado está consumindo o estoque — feche antes que acabe',
  },
  'stagnant': {
    icon: Eye,
    label: 'Baixa Procura',
    colors: 'bg-muted text-muted-foreground border-border',
    description: 'Pouca movimentação no mercado — avalie se vale incluir na oferta',
  },
  'negotiation-opportunity': {
    icon: DollarSign,
    label: 'Negocie Preço',
    colors: 'bg-success/15 text-success border-success/30',
    description: 'Estoque parado no fornecedor — momento ideal para negociar desconto',
  },
  'frequent-restock': {
    icon: RefreshCw,
    label: 'Demanda Confirmada',
    colors: 'bg-primary/15 text-primary border-primary/30',
    description: 'Fornecedor reabastece frequentemente — o mercado compra de forma recorrente',
  },
  'class-a': {
    icon: Trophy,
    label: 'Best-Seller',
    colors: ACCENT_FLAG_COLORS,
    description: 'Top 20% em vendas no mercado — produto essencial no portfólio',
  },
};

/** Flags com foco OPERACIONAL (dashboard de risco) */
export const OPERATIONAL_FLAG_CONFIG: Record<IntelligenceFlag, FlagConfig> = {
  'hot-product': {
    icon: Flame,
    label: 'Produto Quente',
    colors: DESTRUCTIVE_FLAG_COLORS,
    description: 'Vendendo rápido no fornecedor — pode acabar em breve',
  },
  'stockout-risk': {
    icon: AlertTriangle,
    label: 'Risco de Ruptura',
    colors: DESTRUCTIVE_FLAG_COLORS,
    description: 'Menos de 7 dias de estoque restante no fornecedor',
  },
  'stagnant': {
    icon: Moon,
    label: 'Estagnado',
    colors: 'bg-muted text-muted-foreground border-border',
    description: 'Baixa saída nos últimos 30 dias com estoque alto',
  },
  'negotiation-opportunity': {
    icon: DollarSign,
    label: 'Oportunidade de Desconto',
    colors: 'bg-success/15 text-success border-success/30',
    description: 'Estoque encalhado no fornecedor — bom momento para pedir desconto',
  },
  'frequent-restock': {
    icon: RefreshCw,
    label: 'Alta Demanda',
    colors: 'bg-primary/15 text-primary border-primary/30',
    description: 'Fornecedor reabastece frequentemente — demanda confirmada',
  },
  'class-a': {
    icon: Star,
    label: 'Classe A',
    colors: ACCENT_FLAG_COLORS,
    description: 'Top 20% em giro de estoque no fornecedor',
  },
};

// ---------- Trend display helpers ----------

export function formatVelocityTrendOperational(trend: number | null): { value: string; label: string } {
  if (trend === null || trend === undefined) return { value: '—', label: '' };
  const pct = (trend - 1) * 100;
  if (!Number.isFinite(pct)) return { value: '—', label: '' };
  return {
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`,
    label: trend > 1.5 ? 'acelerando!' : trend > 1 ? 'crescendo' : trend > 0.5 ? 'desacelerando' : 'caindo',
  };
}

export function formatVelocityTrendCommercial(trend: number | null): { value: string; sub: string; isPositive: boolean } {
  if (trend === null || trend === undefined) return { value: '—', sub: '', isPositive: false };
  const pct = (trend - 1) * 100;
  if (!Number.isFinite(pct)) return { value: '—', sub: '', isPositive: false };
  return {
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`,
    sub: trend > 1.5 ? 'acelerando forte!' :
         trend > 1 ? 'demanda crescente' :
         trend > 0.5 ? 'desacelerando' : 'queda de interesse',
    isPositive: trend > 1,
  };
}

// ---------- Safe date formatting ----------

export function safeParseDateForChart(dateStr: string): { dateFormatted: string; fullDate: string } | null {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return {
      dateFormatted: format(d, 'dd/MM', { locale: ptBR }),
      fullDate: format(d, 'dd/MM/yyyy', { locale: ptBR }),
    };
  } catch {
    return null;
  }
}

// ---------- Safe price_changes extraction (#3/#12 fix) ----------

/**
 * Safely extracts price_changes_30d from velocity data
 * without unsafe double casts.
 */
export function safePriceChanges(velocityData: unknown): number {
  if (velocityData === null || velocityData === undefined || typeof velocityData !== 'object') return 0;
  const record = velocityData as Record<string, unknown>;
  const val = record.price_changes_30d;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  return 0;
}
