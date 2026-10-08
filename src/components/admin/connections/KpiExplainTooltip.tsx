/**
 * KpiExplainTooltip — Onda 14
 *
 * Tooltip rico para o modo "Ver como calculamos". Estrutura padronizada:
 *  - Resumo (1 linha)
 *  - Fórmula (mono)
 *  - Janela de tempo
 *  - Fonte de dados (tabela/coluna)
 *  - Threshold/alvo (opcional)
 */
import { Calculator, Clock, Database, Target, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface KpiExplain {
  /** Resumo curto do que o KPI representa */
  summary: string;
  /** Fórmula em pseudocódigo / SQL-like */
  formula: string;
  /** Janela de tempo considerada */
  window: string;
  /** Fonte de dados (tabela.coluna ou múltiplas) */
  source: string;
  /** Threshold/alvo opcional */
  threshold?: string;
}

function ExplainDetails({ explain }: { explain: KpiExplain }) {
  return (
    <dl className="px-3 py-2 space-y-2 text-[11px]">
      <div className="flex gap-2"><Calculator className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" /><div className="min-w-0"><dt className="font-semibold text-muted-foreground uppercase tracking-wide text-[9px]">Fórmula</dt><dd className="font-mono text-[10.5px] leading-snug break-words bg-muted/40 rounded px-1.5 py-0.5 mt-0.5">{explain.formula}</dd></div></div>
      <div className="flex gap-2"><Clock className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" /><div className="min-w-0"><dt className="font-semibold text-muted-foreground uppercase tracking-wide text-[9px]">Janela</dt><dd className="leading-snug">{explain.window}</dd></div></div>
      <div className="flex gap-2"><Database className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" /><div className="min-w-0"><dt className="font-semibold text-muted-foreground uppercase tracking-wide text-[9px]">Fonte</dt><dd className="font-mono text-[10.5px] leading-snug break-words">{explain.source}</dd></div></div>
      {explain.threshold && <div className="flex gap-2"><Target className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" /><div className="min-w-0"><dt className="font-semibold text-muted-foreground uppercase tracking-wide text-[9px]">Alvo</dt><dd className="leading-snug">{explain.threshold}</dd></div></div>}
    </dl>
  );
}

export function KpiExplainTooltip({
  explain,
  className,
}: {
  explain: KpiExplain;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Ver como calculamos: ${explain.summary}`}
          className={cn(
            "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full",
            "text-primary/80 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            "transition-colors",
            className,
          )}
        >
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm p-0 overflow-hidden">
        <div className="px-3 py-2 bg-primary/5 border-b border-border/40">
          <p className="text-xs font-semibold leading-snug">{explain.summary}</p>
        </div>
        <ExplainDetails explain={explain} />
      </TooltipContent>
    </Tooltip>
  );
}
