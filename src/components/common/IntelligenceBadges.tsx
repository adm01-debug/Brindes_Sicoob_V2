/**
 * IntelligenceBadges — renders market intelligence badges on product pages.
 * Data-driven from useProductIntelligenceBadges hook.
 */
import { motion } from "framer-motion";
import { Flame, Zap, Package, Rocket, AlertTriangle, Sparkles, Star, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { IntelligenceBadge, IntelligenceBadgeType } from "@/hooks/useProductIntelligenceBadges";

const PRIMARY_BADGE_COLORS = 'bg-primary/15 text-primary border-primary/30';
const PULSE_ANIMATION = 'animate-pulse';

const badgeConfig: Record<IntelligenceBadgeType, {
  icon: typeof Flame;
  colors: string;
  animation?: string;
}> = {
  'featured': {
    icon: Sparkles,
    colors: PRIMARY_BADGE_COLORS,
  },
  'new-arrival': {
    icon: Star,
    colors: PRIMARY_BADGE_COLORS,
  },
  'on-sale': {
    icon: Tag,
    colors: PRIMARY_BADGE_COLORS,
    animation: PULSE_ANIMATION,
  },
  'best-seller': {
    icon: Flame,
    colors: PRIMARY_BADGE_COLORS,
  },
  'popular': {
    icon: Zap,
    colors: PRIMARY_BADGE_COLORS,
  },
  'normal': {
    icon: Package,
    colors: 'bg-muted text-muted-foreground border-border',
  },
  'emergente': {
    icon: Rocket,
    colors: PRIMARY_BADGE_COLORS,
    animation: PULSE_ANIMATION,
  },
  'last-units': {
    icon: AlertTriangle,
    colors: 'bg-destructive/15 text-destructive border-destructive/30',
    animation: PULSE_ANIMATION,
  },
};

interface IntelligenceBadgesProps {
  badges: IntelligenceBadge[];
  turnoverScore?: number | null;
  className?: string;
  isError?: boolean;
  isFetching?: boolean;
  isEmpty?: boolean;
  hasMarketData?: boolean;
  onRetry?: () => void;
}

function MarketIntelligenceStatus({
  isError, isFetching, isEmpty, hasMarketData, onRetry,
}: Pick<IntelligenceBadgesProps, 'isError' | 'isFetching' | 'isEmpty' | 'hasMarketData' | 'onRetry'>) {
  if (isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
        <span>{hasMarketData
          ? "Não foi possível atualizar todos os indicadores. Os dados disponíveis continuam exibidos."
          : "Não foi possível carregar os indicadores de mercado deste produto."}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={() => void onRetry()} disabled={isFetching}>
            {isFetching ? "Tentando…" : "Tentar novamente"}
          </Button>
        )}
      </div>
    );
  }
  if (isEmpty) return <p role="status" className="text-sm text-muted-foreground">Sem indicadores de mercado disponíveis para este produto.</p>;
  return null;
}

function IntelligenceBadgeItem({ badge, index }: { badge: IntelligenceBadge; index: number }) {
  const config = badgeConfig[badge.type];
  const Icon = config.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1, type: "spring", stiffness: 300 }}
        >
          <Badge
            variant="outline"
            className={cn("gap-1.5 px-2.5 py-1 font-semibold text-xs border cursor-default", config.colors, config.animation)}
          >
            <Icon className="h-3.5 w-3.5" />
            {badge.emoji} {badge.label}
          </Badge>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-center">
        <p className="text-xs">{badge.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function turnoverDescription(turnoverScore: number): string {
  if (turnoverScore >= 80) return 'Alto potencial comercial';
  if (turnoverScore >= 50) return 'Bom potencial comercial';
  if (turnoverScore >= 20) return 'Potencial moderado';
  return 'Potencial baixo';
}

function TurnoverScoreBadge({ score, delay }: { score: number; delay: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay }}
        >
          <Badge variant="secondary" className="text-xs font-mono cursor-default">Potencial: {score}</Badge>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px] text-center">
        <p className="text-xs">{turnoverDescription(score)}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function IntelligenceBadgeGroup({ badges, turnoverScore }: Pick<IntelligenceBadgesProps, 'badges' | 'turnoverScore'>) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges.map((badge, i) => <IntelligenceBadgeItem key={badge.type} badge={badge} index={i} />)}
      {turnoverScore !== null && turnoverScore !== undefined && (
        <TurnoverScoreBadge score={turnoverScore} delay={badges.length * 0.1} />
      )}
    </div>
  );
}

export function IntelligenceBadges({
  badges, turnoverScore, className, isError = false, isFetching = false,
  isEmpty = false, hasMarketData = false, onRetry,
}: IntelligenceBadgesProps) {
  if (!badges.length && !isError && !isEmpty) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <MarketIntelligenceStatus
        isError={isError}
        isFetching={isFetching}
        isEmpty={isEmpty}
        hasMarketData={hasMarketData}
        onRetry={onRetry}
      />
      <IntelligenceBadgeGroup badges={badges} turnoverScore={turnoverScore} />
    </div>
  );
}
