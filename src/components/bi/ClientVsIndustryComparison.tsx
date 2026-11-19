/**
 * ClientVsIndustryComparison — Zona 5 do BI.
 * Sprint 2: 5ª métrica = Share-of-Wallet (estimativa heurística) com gap em R$.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scale, TrendingUp, TrendingDown, Minus, Lightbulb, Info, Wallet, AlertCircle, RefreshCw } from "lucide-react";
import {
  useClientVsIndustry,
  type ClientVsIndustryResult,
  type MetricComparison,
} from "@/hooks/bi/useClientVsIndustry";
import { ComparisonSkeleton } from "@/components/bi/BISkeletons";
import { formatCurrencyCompact, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
  ramoAtividade: string | null;
}

function formatValue(m: MetricComparison): string {
  if (m.format === "currency") return formatCurrencyCompact(m.clientValue);
  return m.clientValue.toFixed(m.clientValue < 10 ? 1 : 0);
}
function formatIndustry(m: MetricComparison): string {
  if (m.format === "currency") return formatCurrencyCompact(m.industryAvg);
  return m.industryAvg.toFixed(m.industryAvg < 10 ? 1 : 0);
}

function classificationStyles(c: MetricComparison["classification"]) {
  switch (c) {
    case "above":
      return { text: "text-success", bar: "bg-success", bg: "bg-success/10", Icon: TrendingUp, label: "Acima da média" };
    case "below":
      return { text: "text-destructive", bar: "bg-destructive", bg: "bg-destructive/10", Icon: TrendingDown, label: "Abaixo da média" };
    case "on_par":
      return { text: "text-warning", bar: "bg-warning", bg: "bg-warning/10", Icon: Minus, label: "Na média" };
    default:
      return { text: "text-muted-foreground", bar: "bg-muted", bg: "bg-muted/40", Icon: Minus, label: "Sem dados" };
  }
}

function MetricRow({ metric }: { metric: MetricComparison }) {
  const styles = classificationStyles(metric.classification);
  const total = Math.max(metric.clientValue, metric.industryAvg, 1);
  const clientPct = Math.min(100, (metric.clientValue / total) * 100);
  const industryPct = Math.min(100, (metric.industryAvg / total) * 100);
  const deltaSign = metric.deltaPercent > 0 ? "+" : "";

  return (
    <div className="space-y-2 p-3 rounded-lg border bg-card/50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {metric.label}
        </span>
        <Badge variant="outline" className={cn("text-[10px] gap-1 border-0", styles.bg, styles.text)}>
          <styles.Icon className="h-3 w-3" />
          {deltaSign}
          {Math.round(metric.deltaPercent)}%
        </Badge>
      </div>

      <div className="space-y-1.5">
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-foreground">Cliente</span>
            <span className={cn("font-bold tabular-nums", styles.text)}>{formatValue(metric)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", styles.bar)} style={{ width: `${clientPct}%` }} />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Média do setor</span>
            <span className="text-muted-foreground tabular-nums">{formatIndustry(metric)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-muted-foreground/40 transition-all" style={{ width: `${industryPct}%` }} />
          </div>
        </div>
      </div>

      <p className={cn("text-[10px] font-medium", styles.text)}>{styles.label}</p>
    </div>
  );
}

/** Card especial: Share-of-Wallet com gauge e gap em R$. */
function ShareOfWalletCard({ clientLtv, industryAvgLtv }: { clientLtv: number; industryAvgLtv: number }) {
  const [open, setOpen] = useState(false);
  // Heurística: cliente / (cliente + 1.5 × média setor) — capped 5..95%
  const denom = clientLtv + industryAvgLtv * 1.5;
  const rawShare = denom > 0 ? clientLtv / denom : 0;
  const share = Math.max(0.05, Math.min(0.95, rawShare));
  const sharePct = Math.round(share * 100);
  // Gap: receita potencial não capturada = 1.5 × setor (top tier) − cliente atual
  const potentialCap = industryAvgLtv * 1.5;
  const gap = Math.max(0, potentialCap - clientLtv);

  const tone =
    sharePct >= 50 ? { text: "text-success", bar: "bg-success", bg: "bg-success/10", label: "Carteira dominante" }
    : sharePct >= 25 ? { text: "text-warning", bar: "bg-warning", bg: "bg-warning/10", label: "Espaço para crescer" }
    : { text: "text-destructive", bar: "bg-destructive", bg: "bg-destructive/10", label: "Baixa penetração" };

  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="text-left space-y-2 p-3 rounded-lg border bg-card/50 hover:border-primary/40 hover:shadow-sm transition-all"
      aria-expanded={open}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Wallet className="h-3 w-3" /> Share of wallet
        </span>
        <Badge variant="outline" className={cn("text-[10px] gap-1 border-0", tone.bg, tone.text)}>
          {sharePct}%
        </Badge>
      </div>
      <div className={cn("font-display text-2xl font-bold tabular-nums", tone.text)}>{sharePct}%</div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${sharePct}%` }} />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Gap não capturado</span>
        <span className="font-bold text-foreground">{formatCurrency(gap)}</span>
      </div>
      <p className={cn("text-[10px] font-medium", tone.text)}>{tone.label}</p>
      {open && (
        <p className="text-[10px] leading-relaxed text-muted-foreground pt-1 border-t">
          Estimativa baseada no LTV do cliente vs LTV potencial do ramo (1.5× a média). Gap representa
          quanto este cliente ainda pode crescer dentro do seu setor.
        </p>
      )}
    </button>
  );
}

/**
 * Falha de consulta não é amostra insuficiente.
 *
 * Sem este caminho, um erro na leitura do histórico ou do benchmark caía no
 * cartão de "amostra do ramo ainda insuficiente" — o vendedor concluía que o
 * setor dele é pequeno demais, quando na verdade a consulta caiu.
 */
function ComparativoIndisponivel({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/30 border-dashed">
      <CardContent className="p-6 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <div className="space-y-2">
          <div>
            <h3 className="font-display font-semibold text-sm">Comparativo indisponível</h3>
            <p className="text-xs text-muted-foreground">
              Não foi possível consultar o histórico ou o benchmark. Isto não é amostra
              insuficiente do ramo.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />Tentar novamente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Dado em cache continua na tela, mas identificado como desatualizado. */
function AvisoDeCacheDesatualizado({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="status" className="flex items-center justify-between gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs">
      <span>Falha ao atualizar. Exibindo o último comparativo disponível.</span>
      <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5" />Tentar novamente
      </Button>
    </div>
  );
}

/**
 * O selo tem de dizer a verdade sobre o lado do cliente.
 *
 * O benchmark do setor é sempre medido; o lado do cliente nem sempre. Carimbar
 * "Dados reais" quando o histórico veio do conjunto de demonstração afirma, para
 * o vendedor, que um LTV ilustrativo é medido. Cliente sem pedido e falha de
 * consulta não chegam aqui: têm cartão próprio, acima.
 */
function OrigemDoDado({ isMock, desatualizado }: { isMock: boolean; desatualizado: boolean }) {
  if (desatualizado) {
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning border-0 text-[10px]">
        Último cache · atualização falhou
      </Badge>
    );
  }
  if (isMock) {
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning border-0 text-[10px]">
        Cliente de demonstração · números ilustrativos
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-success/10 text-success border-0 text-[10px]">
      Dados reais
    </Badge>
  );
}

/**
 * Sem histórico do lado do cliente não há comparativo — e "R$ 0 vs média do
 * setor" seria uma afirmação falsa, não um comparativo vazio. Falha de consulta
 * ganha retry; cliente que ainda não comprou, não (não há o que repetir).
 */
function ClienteSemComparativo(
  { ramoAtividade, indisponivel, onRetry }:
  { ramoAtividade: string; indisponivel: boolean; onRetry: () => void },
) {
  return (
    <Card className="border-[1.5px] border-dashed">
      <CardContent className="p-6 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-display font-semibold text-sm">Comparativo Cliente × Setor</h3>
          <p className="text-xs text-muted-foreground" role={indisponivel ? 'alert' : 'status'}>
            {indisponivel
              ? `Histórico do cliente indisponível: não dá para comparar com o ramo ${ramoAtividade} agora.`
              : `Este cliente ainda não tem pedido no histórico, então não há o que comparar com o ramo ${ramoAtividade}.`}
          </p>
          {indisponivel && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Amostra do ramo pequena demais para benchmarking — e não falha de consulta. */
function AmostraInsuficiente(
  { ramoAtividade, daysWindow }: { ramoAtividade: string; daysWindow: number },
) {
  return (
    <Card className="border-[1.5px] border-dashed">
      <CardContent className="p-6 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-semibold text-sm">Comparativo Cliente × Setor</h3>
          <p className="text-xs text-muted-foreground">
            Amostra do ramo <span className="font-medium">{ramoAtividade}</span> ainda
            insuficiente para gerar benchmarking. Mínimo de 3 empresas com orçamentos
            nos últimos {daysWindow} dias.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Comparativo com as duas pontas medidas: o único caminho que exibe números. */
function ComparativoPronto(
  { comparison, ramoAtividade }:
  { comparison: ClientVsIndustryResult; ramoAtividade: string },
) {
  const { isError, isMock, refetch, sampleSize, daysWindow, metrics, insight } = comparison;
  const ltvMetric = metrics.find((m) => m.label === "LTV");

  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-md shadow-success/20">
              <Scale className="h-4 w-4 text-success-foreground" />
            </div>
            <div>
              <CardTitle className="font-display text-base">Cliente × Setor</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Benchmark contra {sampleSize} empresa{sampleSize !== 1 ? "s" : ""} de{" "}
                <span className="font-medium">{ramoAtividade}</span> · últimos {daysWindow} dias
              </p>
            </div>
          </div>
          <OrigemDoDado isMock={isMock} desatualizado={isError} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isError && <AvisoDeCacheDesatualizado onRetry={() => void refetch()} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map((m) => (
            <MetricRow key={m.label} metric={m} />
          ))}
          {ltvMetric && (
            <ShareOfWalletCard
              clientLtv={ltvMetric.clientValue}
              industryAvgLtv={ltvMetric.industryAvg}
            />
          )}
        </div>

        {insight && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-foreground leading-relaxed">{insight}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ClientVsIndustryComparison({ clientId, ramoAtividade }: Props) {
  const comparison = useClientVsIndustry(clientId, ramoAtividade);
  const { isLoading, isError, hasClientData, isClientDataUnavailable, refetch, hasEnoughSample, daysWindow, metrics } = comparison;

  if (!ramoAtividade) return null;
  if (isLoading) return <ComparisonSkeleton />;
  // Erro sem nada em cache vem antes de tudo: nem "sem pedido" nem "amostra
  // insuficiente" descrevem uma consulta que falhou.
  if (isError && metrics.length === 0) {
    return <ComparativoIndisponivel onRetry={() => void refetch()} />;
  }
  if (!hasClientData) {
    return (
      <ClienteSemComparativo
        ramoAtividade={ramoAtividade}
        indisponivel={isClientDataUnavailable}
        onRetry={() => void refetch()}
      />
    );
  }
  if (!hasEnoughSample) {
    return <AmostraInsuficiente ramoAtividade={ramoAtividade} daysWindow={daysWindow} />;
  }
  return <ComparativoPronto comparison={comparison} ramoAtividade={ramoAtividade} />;
}
