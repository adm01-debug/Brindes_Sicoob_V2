/**
 * ExecutiveSummaryButton — gera resumo executivo (3 parágrafos) e copia/exporta.
 * Inclui também export PPTX (5 slides) ao lado do PDF dossiê.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertCircle, Copy, Loader2, RotateCcw, Sparkles, Presentation } from "lucide-react";
import { toast } from "sonner";
import { useClientHealthScore } from "@/hooks/bi/useClientHealthScore";
import { useClientBI } from "@/hooks/bi/useClientBI";
import { useClientAffinity } from "@/hooks/bi/useClientAffinity";
import { useIndustryTrends } from "@/hooks/bi/useIndustryTrends";
import { useClientSeasonality } from "@/hooks/bi/useClientSeasonality";
import { useClientVsIndustry } from "@/hooks/bi/useClientVsIndustry";
import { useClientCategoryAffinity } from "@/hooks/bi/useClientCategoryAffinity";
import { useIndustryCategoryTrends } from "@/hooks/bi/useIndustryCategoryTrends";
import { generateBIPptx } from "@/lib/bi/pptxGenerator";
import { buildCategorySection } from "@/lib/bi/executive-summary";

interface Props {
  clientId: string;
  clientName: string;
  ramoAtividade: string | null;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function useExecutiveData({ clientId, clientName, ramoAtividade }: Props) {
  return {
    clientName, ramoAtividade,
    health: useClientHealthScore(clientId, ramoAtividade), bi: useClientBI(clientId),
    affinity: useClientAffinity(clientId), trends: useIndustryTrends(ramoAtividade, clientId),
    seas: useClientSeasonality(clientId, ramoAtividade), vs: useClientVsIndustry(clientId, ramoAtividade),
    catAffinity: useClientCategoryAffinity(clientId), catIndustry: useIndustryCategoryTrends(ramoAtividade, clientId),
  };
}

type ExecutiveData = ReturnType<typeof useExecutiveData>;
const HEALTH_LABELS: Record<string, string> = { healthy: "saudável", attention: "em atenção", risk: "em risco", unknown: "sem dados suficientes" };

interface UnavailableSource {
  name: string;
  retry: () => Promise<unknown>;
}

function getExecutiveAvailability(data: ExecutiveData) {
  const commonSources = [
    { name: "histórico do cliente", loading: data.bi.isLoading, failed: data.bi.isUnavailable, retry: data.bi.refetch },
    { name: "comparativo do setor", loading: data.vs.isLoading, failed: data.vs.isError, retry: data.vs.refetch },
    { name: "sazonalidade", loading: data.seas.isLoading, failed: Boolean(data.seas.isError || data.seas.industryError), retry: data.seas.refetch },
    { name: "afinidade do cliente", loading: data.affinity.isLoading, failed: data.affinity.isError, retry: data.affinity.refetch },
    { name: "tendências do setor", loading: data.trends.isLoading, failed: data.trends.isError, retry: data.trends.refetch },
  ];
  const pptxSources = [
    { name: "categorias do cliente", loading: data.catAffinity.isLoading, failed: data.catAffinity.isError, retry: data.catAffinity.refetch },
    { name: "categorias do setor", loading: data.catIndustry.isLoading, failed: data.catIndustry.isError, retry: data.catIndustry.refetch },
  ];

  const failedCommonSources: UnavailableSource[] = commonSources
    .filter((source) => source.failed)
    .map(({ name, retry }) => ({ name, retry: async () => { await retry?.(); } }));
  const failedPptxSources: UnavailableSource[] = pptxSources
    .filter((source) => source.failed)
    .map(({ name, retry }) => ({ name, retry: async () => { await retry?.(); } }));

  return {
    loadingCopy: commonSources.some((source) => source.loading) || data.health.isLoading,
    loadingPptx: commonSources.some((source) => source.loading) || pptxSources.some((source) => source.loading) || data.health.isLoading,
    failedCopy: failedCommonSources,
    failedPptx: [...failedCommonSources, ...failedPptxSources],
  };
}

function ramoSuffix(ramo: string | null): string { return ramo ? ` (${ramo})` : ""; }
function lastOrderSuffix(days: number | null | undefined): string { return typeof days === "number" ? ` · última compra há ${days} dias` : ""; }
function topCategory(data: { categories?: Array<{ category?: string | null }> } | null | undefined): string { return data?.categories?.[0]?.category ?? "—"; }
function topTrend(data: { trends?: Array<{ productName?: string | null }> } | null | undefined): string { return data?.trends?.[0]?.productName ?? "—"; }

function buildSummary(data: ExecutiveData): string {
  const { health, bi, affinity, trends, seas, clientName, ramoAtividade } = data;
  const tier = HEALTH_LABELS[health.tier] ?? "sem classificação";
  const lastOrder = lastOrderSuffix(bi.daysSinceLastOrder);
  return [
    `📊 Resumo executivo — ${clientName}${ramoSuffix(ramoAtividade)}`, "",
    `▸ Saúde: cliente ${tier}${health.tier === "unknown" ? " (pontuação indisponível)" : ` (Health Score ${health.score}/100)`}. ${health.crossZoneInsight}`, "",
    `▸ Histórico: LTV ${fmtBRL(bi.ltv)} em ${bi.ordersCount} pedidos · ticket médio ${fmtBRL(bi.avgTicket)}${lastOrder}. Categoria forte: ${topCategory(affinity.data)}.`, "",
    `▸ Oportunidade: share-of-wallet estimado em ${health.shareOfWalletPct}% (potencial não capturado: ${fmtBRL(health.potentialUntappedBRL)}). ${health.windowLabel}. Próxima ação: ${health.nextActionLabel} — ${health.nextActionDetail}`, "",
    `▸ Setor: top tendência atual é "${topTrend(trends.data)}". ${seas.insight ?? ""}`, "", `📞 Script: "${health.scriptHint}"`,
  ].join("\n");
}

function useExecutiveActions(data: ExecutiveData) {
  const [busy, setBusy] = useState<null | "copy" | "pptx" | "retry">(null);
  const availability = getExecutiveAvailability(data);
  const handleCopy = async () => {
    setBusy("copy");
    try {
      await navigator.clipboard.writeText(buildSummary(data));
      toast.success("Resumo executivo copiado!", { description: "Cole no WhatsApp, e-mail ou CRM." });
    } catch (error) {
      toast.error("Erro ao copiar", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally { setBusy(null); }
  };
  const handlePptx = async () => {
    setBusy("pptx");
    try {
      await generateBIPptx({ clientName: data.clientName, ramoAtividade: data.ramoAtividade, health: data.health, bi: data.bi, affinity: data.affinity.data ?? null, trends: data.trends.data ?? null, seasonality: data.seas, vs: data.vs, categorySection: buildCategorySection(data.catAffinity, data.catIndustry) });
      toast.success("PPTX gerado!", { description: "Arquivo baixado." });
    } catch (error) {
      console.error(error);
      toast.error("Falha ao gerar PPTX", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally { setBusy(null); }
  };

  const handleRetry = async () => {
    const failedSources = [...availability.failedCopy, ...availability.failedPptx]
      .filter((source, index, sources) => sources.findIndex((candidate) => candidate.name === source.name) === index);
    if (failedSources.length === 0) return;
    setBusy("retry");
    try {
      await Promise.allSettled(failedSources.map((source) => source.retry()));
    } finally { setBusy(null); }
  };

  return { busy, handleCopy, handlePptx, handleRetry, availability };
}

function getAvailabilityMessage(availability: ReturnType<typeof getExecutiveAvailability>) {
  const pptxOnlyFailures = availability.failedPptx.filter(
    (source) => !availability.failedCopy.some((commonSource) => commonSource.name === source.name),
  );
  if (availability.failedCopy.length > 0) {
    const summaryFailures = availability.failedCopy.map((source) => source.name).join(", ");
    const pptxFailures = pptxOnlyFailures.map((source) => source.name).join(", ");
    return `Resumo indisponível: falha em ${summaryFailures}.${pptxFailures ? ` O PPTX também depende de ${pptxFailures}.` : ""}`;
  }
  if (pptxOnlyFailures.length > 0) {
    return `PPTX indisponível: falha em ${pptxOnlyFailures.map((source) => source.name).join(", ")}. O resumo para copiar continua disponível.`;
  }
  return null;
}

function SummaryTriggerContent({ busy, loading, statusMessage }: {
  busy: "copy" | "pptx" | "retry" | null;
  loading: boolean;
  statusMessage: string | null;
}) {
  const icon = busy || loading
    ? <Loader2 className="h-4 w-4 animate-spin" />
    : statusMessage
      ? <AlertCircle className="h-4 w-4 text-destructive" />
      : <Sparkles className="h-4 w-4 text-violet-500" />;
  const label = loading ? "Carregando dados…" : statusMessage ? "Resumo indisponível" : "Resumo";
  return <>{icon}{label}</>;
}

function SummaryAvailabilityNotice({ statusMessage, busy, onRetry }: {
  statusMessage: string | null;
  busy: "copy" | "pptx" | "retry" | null;
  onRetry: () => void;
}) {
  if (!statusMessage) return null;
  return <><div role="alert" className="px-2 py-2 text-xs text-destructive">{statusMessage}</div><DropdownMenuItem onClick={onRetry} disabled={busy !== null} className="gap-2"><RotateCcw className="h-4 w-4" /><span>{busy === "retry" ? "Atualizando fontes…" : "Tentar novamente"}</span></DropdownMenuItem><DropdownMenuSeparator /></>;
}

function SummaryMenu({
  busy, onCopy, onPptx, onRetry, availability,
}: {
  busy: "copy" | "pptx" | "retry" | null;
  onCopy: () => void;
  onPptx: () => void;
  onRetry: () => void;
  availability: ReturnType<typeof getExecutiveAvailability>;
}) {
  const loading = availability.loadingCopy;
  const statusMessage = getAvailabilityMessage(availability);

  return (
    <DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="gap-1.5" disabled={busy !== null || loading}><SummaryTriggerContent busy={busy} loading={loading} statusMessage={statusMessage} /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel className="text-xs">Resumo executivo</DropdownMenuLabel><DropdownMenuSeparator />
        <SummaryAvailabilityNotice statusMessage={statusMessage} busy={busy} onRetry={onRetry} />
        <DropdownMenuItem onClick={onCopy} disabled={busy !== null || availability.loadingCopy || availability.failedCopy.length > 0} className="gap-2"><Copy className="h-4 w-4" /><div className="flex flex-col"><span className="text-sm">Copiar para WhatsApp</span><span className="text-[10px] text-muted-foreground">3 parágrafos prontos</span></div></DropdownMenuItem>
        <DropdownMenuItem onClick={onPptx} disabled={busy !== null || availability.loadingPptx || availability.failedPptx.length > 0} className="gap-2"><Presentation className="h-4 w-4" /><div className="flex flex-col"><span className="text-sm">Exportar PPTX (5 slides)</span><span className="text-[10px] text-muted-foreground">Para reunião comercial</span></div></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ExecutiveSummaryButton({ clientId, clientName, ramoAtividade }: Props) {
  const data = useExecutiveData({ clientId, clientName, ramoAtividade });
  const { busy, handleCopy, handlePptx, handleRetry, availability } = useExecutiveActions(data);
  return <SummaryMenu busy={busy} onCopy={handleCopy} onPptx={handlePptx} onRetry={handleRetry} availability={availability} />;
}
