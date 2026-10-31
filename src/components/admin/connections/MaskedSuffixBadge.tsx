import { isNullish } from "@/components/admin/utils/nullish";
import { AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { diagnoseMaskedSuffix, formatDisplaySuffix } from "@/lib/masked-suffix";

interface Props {
  /** Sufixo cru retornado pelo backend (pode ser null, curto ou completo). */
  suffix: string | null | undefined;
  /** Nome do secret — usado para personalizar a mensagem de orientação. */
  secretName?: string;
  /**
   * Comprimento total da credencial (quando conhecido). Usado como fallback
   * para gerar um sufixo derivado (`L=NN`) quando `suffix` está ausente,
   * preservando o layout sem expor dados.
   */
  length?: number | null;
  /** Quando true, mostra o badge mesmo no estado válido (default: false). */
  showWhenValid?: boolean;
  /** Mostra o sufixo formatado ao lado do ícone (default: true). */
  showSuffix?: boolean;
  className?: string;
}

function suffixTone(status: ReturnType<typeof diagnoseMaskedSuffix>['status']) {
  if (status === "missing") {
    return { icon: ShieldAlert, chip: "bg-destructive/10 border-destructive/40 text-destructive", ring: "ring-destructive/30" };
  }
  if (status === "short") {
    return { icon: AlertTriangle, chip: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300", ring: "ring-amber-500/30" };
  }
  return { icon: CheckCircle2, chip: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-500/30" };
}

function hasPositiveLength(length: number | null | undefined): length is number {
  return !isNullish(length) && length > 0;
}

function shouldShowPlainSuffix(status: ReturnType<typeof diagnoseMaskedSuffix>['status'], showWhenValid: boolean): boolean {
  return status === "valid" && !showWhenValid;
}

function isFallbackSuffix(status: ReturnType<typeof diagnoseMaskedSuffix>['status'], suffix: string | null | undefined): boolean {
  return status !== "valid" && (suffix ?? "").trim().length === 0;
}

function PlainSuffix({ show, display, message, className }: { show: boolean; display: string; message: string; className?: string }) {
  if (!show) return null;
  return <span className={cn("font-mono text-xs text-muted-foreground tabular-nums", className)} aria-label={message}>{display}</span>;
}

function FallbackExplanation({ show, length, display }: { show: boolean; length: number | null | undefined; display: string }) {
  if (!show || !hasPositiveLength(length)) return null;
  return (
    <p className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
      Exibindo placeholder derivado <span className="font-mono">{display}</span> (comprimento total: {length} chars)
      até que o sufixo real seja regenerado.
    </p>
  );
}

function SuffixStatusChip({ diagnosis, display, fallback, length, showSuffix, className }: {
  diagnosis: ReturnType<typeof diagnoseMaskedSuffix>;
  display: string;
  fallback: boolean;
  length: number | null | undefined;
  showSuffix: boolean;
  className?: string;
}) {
  const tone = suffixTone(diagnosis.status);
  const Icon = tone.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span role="status" aria-live="polite" aria-label={diagnosis.message} className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ring-1 cursor-help", tone.chip, tone.ring, className)}>
          <Icon className="h-3 w-3 shrink-0" aria-hidden />{showSuffix && <span className="font-mono tabular-nums">{display}</span>}{fallback && <span className="text-[9px] uppercase tracking-wider opacity-80" aria-hidden>fallback</span>}<span className="hidden sm:inline">— {diagnosis.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-xs text-xs leading-relaxed"><p className="font-medium mb-1">{diagnosis.label}</p><p className="text-muted-foreground">{diagnosis.message}</p><FallbackExplanation show={fallback} length={length} display={display} /></TooltipContent>
    </Tooltip>
  );
}

/**
 * Renderiza o sufixo mascarado com um indicador visual de saúde:
 * - válido (4+ chars): nenhum aviso (a menos que showWhenValid)
 * - curto (<4 chars): chip âmbar com tooltip explicativo
 * - ausente: chip destrutivo com tooltip + sufixo derivado (`L=NN`)
 *
 * Sempre acessível: o tooltip vira `aria-description` para leitores de tela.
 * Layout estável: sempre renderiza 8 chars (`••••XXXX`) no slot do sufixo,
 * mesmo no fallback.
 */
export function MaskedSuffixBadge({
  suffix,
  secretName,
  length,
  showWhenValid = false,
  showSuffix = true,
  className,
}: Props) {
  const diagnosis = diagnoseMaskedSuffix(suffix, { secretName });
  // Sempre usa o resolvedor com fallback derivado — garante layout estável
  // mesmo quando o sufixo cru é nulo/curto.
  const display = formatDisplaySuffix(suffix, { length });
  const isFallback = isFallbackSuffix(diagnosis.status, suffix);

  if (shouldShowPlainSuffix(diagnosis.status, showWhenValid)) {
    return <PlainSuffix show={showSuffix} display={display} message={diagnosis.message} className={className} />;
  }

  return <SuffixStatusChip diagnosis={diagnosis} display={display} fallback={isFallback} length={length} showSuffix={showSuffix} className={className} />;
}
