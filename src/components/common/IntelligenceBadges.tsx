/**
 * IntelligenceBadges — renders market intelligence badges on product pages.
 * Data-driven from useProductIntelligenceBadges hook.
 */
import { motion } from "framer-motion";
import { Flame, Zap, Package, Rocket, AlertTriangle, AlertCircle, Sparkles, Star, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  /** Alguma consulta de mercado falhou. */
  isError?: boolean;
  /** As consultas responderam sem dado de mercado: ausência confirmada. */
  isEmpty?: boolean;
  /** Existe dado de mercado medido, mesmo que a atualização tenha falhado. */
  hasMarketData?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

interface BadgesErrorAlertProps {
  hasMarketData: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

function BadgesErrorAlert({ hasMarketData, onRetry, isRetrying }: BadgesErrorAlertProps) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {hasMarketData ? "Não foi possível atualizar todos os indicadores" : "Não foi possível carregar os indicadores"}
      </AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{hasMarketData ? "Os dados disponíveis continuam exibidos." : "Os valores não foram substituídos por estimativas."}</span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} disabled={isRetrying}>
            Tentar novamente
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

function BadgesList({ badges, turnoverScore }: Pick<IntelligenceBadgesProps, "badges" | "turnoverScore">) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges.map((badge, i) => {
        const config = badgeConfig[badge.type];
        const Icon = config.icon;

        return (
          <Tooltip key={badge.type}>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1.5 px-2.5 py-1 font-semibold text-xs border cursor-default",
                    config.colors,
                    config.animation
                  )}
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
      })}

      {turnoverScore !== null && turnoverScore !== undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: badges.length * 0.1 }}
            >
              <Badge variant="secondary" className="text-xs font-mono cursor-default">
                Potencial: {turnoverScore}
              </Badge>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px] text-center">
            <p className="text-xs">
              {turnoverScore >= 80 ? 'Alto potencial comercial' :
               turnoverScore >= 50 ? 'Bom potencial comercial' :
               turnoverScore >= 20 ? 'Potencial moderado' : 'Potencial baixo'}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function IntelligenceBadges({
  badges, turnoverScore, className, isError, isEmpty, hasMarketData, onRetry, isRetrying,
}: IntelligenceBadgesProps) {
  const alertaDeErro = isError
    ? <BadgesErrorAlert hasMarketData={Boolean(hasMarketData)} onRetry={onRetry} isRetrying={isRetrying} />
    : null;

  // Falha sem nada medido: antes o componente devolvia `null` e o erro ficava
  // invisível, indistinguível de "produto sem indicadores".
  if (isError && !hasMarketData) return <div className={className}>{alertaDeErro}</div>;

  // Ausência confirmada (as duas consultas responderam sem dado) tem texto próprio,
  // para não ser lida como falha.
  if (!badges.length && isEmpty) {
    return <p role="status" className={cn("text-sm text-muted-foreground", className)}>Sem indicadores de mercado disponíveis para este produto.</p>;
  }

  if (!badges.length) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {alertaDeErro}
      <BadgesList badges={badges} turnoverScore={turnoverScore} />
    </div>
  );
}
