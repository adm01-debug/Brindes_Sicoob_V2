/**
 * SecretImpactTooltip
 *
 * Envolve o label/nome de um secret com um tooltip que descreve as telas
 * e fluxos do produto que **deixam de funcionar** quando o valor está
 * ausente ou vazio.
 *
 * Visual:
 *   - Quando `severity` está "alta" (status ausente/vazio), o cursor vira
 *     `help` e um pequeno indicador `Info` aparece ao lado para chamar a
 *     atenção do admin antes de deletar/rotacionar.
 *   - Quando o secret está populado, o tooltip continua disponível em hover
 *     (informacional) sem o badge de alerta.
 */
import type { ReactNode } from 'react';
import { Info, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getSecretImpact, type SecretImpact } from "./secretImpactMap";

interface Props {
  /** Nome canônico do secret (ex.: EXTERNAL_PROMOBRIND_URL). */
  secretName: string;
  /** Conteúdo a ser envolvido (geralmente o `<Label>` ou o nome). */
  children: ReactNode;
  /**
   * Indica se o valor está ausente/vazio agora — quando true, eleva
   * a visibilidade (ícone de alerta + cursor:help).
   */
  isMissing?: boolean;
  className?: string;
}

const SEVERITY_TONE: Record<SecretImpact["severity"], string> = {
  critical: "text-destructive",
  high: "text-destructive",
  medium: "text-warning",
  low: "text-muted-foreground",
};

const SEVERITY_LABEL: Record<SecretImpact["severity"], string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

function ImpactDetails({ impact }: { impact: SecretImpact }) {
  const severityClass = impact.severity === "critical" || impact.severity === "high" ? "border-destructive/40 bg-destructive/10 text-destructive" : impact.severity === "medium" ? "border-warning/40 bg-warning/10 text-warning" : "border-border bg-muted text-muted-foreground";
  return <div className="space-y-2 text-xs max-w-sm"><div className="flex items-center justify-between gap-2"><p className="font-semibold">{impact.system}</p><span className={cn("rounded px-1.5 py-0.5 text-[10px] font-mono uppercase border", severityClass)}>{SEVERITY_LABEL[impact.severity]}</span></div><p className="text-muted-foreground">Se esta chave estiver <strong className={SEVERITY_TONE[impact.severity]}>ausente ou vazia</strong>, os itens abaixo deixam de funcionar:</p><ImpactList title="Telas afetadas" items={impact.screens} mono /><ImpactList title="Fluxos afetados" items={impact.flows} /></div>;
}

function ImpactList({ title, items, mono }: { title: string; items: string[]; mono?: boolean }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{title}</p><ul className="space-y-0.5">{items.map(item => <li key={item} className={mono ? "font-mono text-[11px]" : "text-[11px]"}>• {item}</li>)}</ul></div>;
}

function ImpactTrigger({ secretName, impact, isMissing, className, children }: Props & { impact: SecretImpact | null }) {
  const ariaLabel = impact ? `Impacto de ${secretName}: ${impact.system} (${SEVERITY_LABEL[impact.severity]})` : `Impacto de ${secretName}: sem mapeamento`;
  return <TooltipTrigger asChild><span tabIndex={0} className={cn("inline-flex items-center gap-1 cursor-help focus:outline-none focus:ring-2 focus:ring-ring rounded", className)} aria-label={ariaLabel}>{children}{isMissing && impact ? <AlertTriangle className={cn("h-3 w-3", SEVERITY_TONE[impact.severity])} aria-hidden="true" /> : <Info className="h-3 w-3 text-muted-foreground/60" aria-hidden="true" />}</span></TooltipTrigger>;
}

export function SecretImpactTooltip({
  secretName,
  children,
  isMissing,
  className,
}: Props) {
  const impact = getSecretImpact(secretName);

  // Sem mapeamento: ainda renderiza o trigger mas com mensagem genérica.
  const content = impact ? <ImpactDetails impact={impact} /> : (
    <p className="text-xs max-w-xs">
      Sem mapeamento de impacto para <code className="font-mono">{secretName}</code>.
      Mantenha-a populada se for usada por alguma edge function.
    </p>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <ImpactTrigger secretName={secretName} impact={impact} isMissing={isMissing} className={className}>{children}</ImpactTrigger>
        <TooltipContent side="top" className="max-w-sm">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
