/**
 * IndustryTrendingProducts — Zona 3: tendências do setor (cross-vendedor).
 * Sprint 2: gap analysis ("cliente já compra?") + filtro "só oportunidades" +
 * top 3 oportunidades como hero cards com projeção de receita.
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  TrendingUp, ArrowUp, ArrowDown, Minus, CheckCircle2, Package, Info,
  Target, Check, X, AlertCircle, RefreshCw,
} from "lucide-react";
import { useIndustryTrends, type IndustryTrendItem, type IndustryTrendsResult } from "@/hooks/bi/useIndustryTrends";
import { useClientAffinity } from "@/hooks/bi/useClientAffinity";
import { ProductGridSkeleton } from "@/components/bi/BISkeletons";
import { resolveBICategory, resolveBICategoryLabel } from "@/lib/bi/categoryResolver";
import { useBICategoryFocus } from "@/contexts/BICategoryFocusContext";
import { cn } from "@/lib/utils";

interface Props {
  ramoAtividade: string | null;
  clientId: string;
}

const trendIcon = {
  up: { icon: ArrowUp, className: "text-success" },
  stable: { icon: Minus, className: "text-muted-foreground" },
  down: { icon: ArrowDown, className: "text-destructive" },
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function industryAvailabilityMessage(sourceLabels: string[], affinityUnavailable: boolean): string {
  const detail = affinityUnavailable
    ? "Oportunidades não serão classificadas sem afinidade confirmada."
    : "Atualize a consulta para visualizar os produtos do setor.";
  return `Não foi possível carregar ${sourceLabels.join(" e ")}. ${detail}`;
}

type EnrichedTrend = IndustryTrendItem & { alreadyBuys: boolean; resolvedCategory: string; resolvedSlug: string };
type CategoryChip = { label: string; count: number };

interface IndustryHeaderProps {
  readonly ramoAtividade: string | null;
  readonly data: IndustryTrendsResult | undefined;
  readonly totalCount: number;
  readonly opportunityCount: number;
  readonly onlyOpportunities: boolean;
  readonly onOnlyOpportunitiesChange: (value: boolean) => void;
}

function industrySampleDescription(props: IndustryHeaderProps): string {
  if (!props.ramoAtividade) return "Ramo de atividade não informado no cadastro do cliente";
  if (props.totalCount === 0) return "Sem amostra setorial suficiente nos últimos 90 dias";
  return `Agregado de ${props.data?.companiesInRamo} empresas do mesmo ramo · 90 dias`;
}

function IndustryHeader(props: IndustryHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-info" /></div>
        <div>
          <h2 className="font-display font-semibold">Tendência do setor{props.ramoAtividade && <span className="text-muted-foreground font-normal"> · {props.ramoAtividade}</span>}</h2>
          <p className="text-xs text-muted-foreground">
            {industrySampleDescription(props)}
            {props.totalCount > 0 && <> · <span className="text-success font-medium">{props.opportunityCount} oportunidade{props.opportunityCount !== 1 && "s"}</span></>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {props.totalCount > 0 && <label className="flex items-center gap-2 cursor-pointer text-xs"><Switch checked={props.onlyOpportunities} onCheckedChange={props.onOnlyOpportunitiesChange} aria-label="Mostrar apenas oportunidades" /><span className="font-medium text-foreground">Só oportunidades</span></label>}
        {props.data && (props.data.isMock
          ? <Badge variant="secondary" className="gap-1 text-[10px]"><Info className="h-3 w-3" /> Dados simulados</Badge>
          : props.totalCount > 0
          ? <Badge variant="outline" className="gap-1 border-success/50 text-success text-[10px]"><CheckCircle2 className="h-3 w-3" /> Dados reais</Badge>
          : <Badge variant="secondary" className="gap-1 text-[10px]"><Info className="h-3 w-3" /> Sem amostra</Badge>)}
      </div>
    </div>
  );
}

interface CategoryChipsProps {
  readonly chips: readonly CategoryChip[];
  readonly activeCategory: string | null;
  readonly totalCount: number;
  readonly onChange: (category: string | null) => void;
}

function CategoryChips({ chips, activeCategory, totalCount, onChange }: CategoryChipsProps) {
  if (chips.length <= 1) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mr-1">Categorias:</span>
      <button type="button" onClick={() => onChange(null)} className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors", activeCategory === null ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border text-foreground")}>Todas ({totalCount})</button>
      {chips.map(chip => <button key={chip.label} type="button" onClick={() => onChange(chip.label === activeCategory ? null : chip.label)} className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors", activeCategory === chip.label ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border text-foreground")}>{chip.label} ({chip.count})</button>)}
    </div>
  );
}

function TrendImage({ trend, size }: { readonly trend: EnrichedTrend; readonly size: "hero" | "row" }) {
  const imageClass = size === "hero" ? "h-16 w-16 rounded-lg" : "h-9 w-9 rounded-md";
  const iconClass = size === "hero" ? "h-6 w-6" : "h-4 w-4";
  if (!trend.imageUrl) return <div className={`${imageClass} bg-muted/40 flex items-center justify-center shrink-0`}><Package className={`${iconClass} text-muted-foreground`} /></div>;
  return <div className={`${imageClass} overflow-hidden bg-muted/40 border shrink-0`}><img src={trend.imageUrl} alt={trend.productName} loading="lazy" className="h-full w-full object-contain" onError={event => { event.currentTarget.style.display = "none"; }} /></div>;
}

function OpportunityHeroes({ trends, visible }: { readonly trends: readonly EnrichedTrend[]; readonly visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
      {trends.map((trend, index) => {
        const projectedRevenue = trend.avgPrice * Math.max(trend.unitsSold / Math.max(trend.ordersCount, 1), 1) * 3;
        return <div key={`hero-${index}`} className="relative rounded-xl border-[1.5px] border-success/30 bg-success/5 p-3 hover:shadow-md hover:border-success/50 transition-all"><Badge className="absolute top-2 right-2 bg-success text-success-foreground gap-1 text-[10px]"><Target className="h-3 w-3" /> Oportunidade</Badge><div className="flex gap-3"><TrendImage trend={trend} size="hero" /><div className="min-w-0 flex-1 pt-4"><div className="font-semibold text-sm leading-tight line-clamp-2">{trend.productName}</div><div className="text-[10px] text-muted-foreground mt-0.5">{trend.category}</div></div></div><div className="mt-3 pt-2 border-t border-success/20 grid grid-cols-2 gap-2 text-[11px]"><div><div className="text-muted-foreground">Ticket setor</div><div className="font-bold text-foreground">{fmtBRL(trend.avgPrice)}</div></div><div><div className="text-muted-foreground">Projeção 90d</div><div className="font-bold text-success">{fmtBRL(projectedRevenue)}</div></div></div></div>;
      })}
    </div>
  );
}

function TrendRows({ trends, onlyOpportunities }: { readonly trends: readonly EnrichedTrend[]; readonly onlyOpportunities: boolean }) {
  if (trends.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">{onlyOpportunities ? "Cliente já compra todos os top produtos do setor 🎉" : "Sem dados de tendência para este ramo."}</p>;
  return (
    <div className="space-y-1.5">
      {trends.map((trend, index) => {
        const Trend = trendIcon[trend.trend];
        return <div key={`${trend.productName}-${index}`} className={cn("flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors group", trend.alreadyBuys && "opacity-90")}><div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center font-display font-bold text-xs text-muted-foreground shrink-0">{index + 1}</div><TrendImage trend={trend} size="row" /><div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{trend.productName}</div><div className="text-xs text-muted-foreground">{trend.category}</div></div><div className="shrink-0 hidden sm:flex items-center gap-1.5">{trend.alreadyBuys ? <Badge variant="outline" className="gap-1 border-success/40 text-success text-[10px]"><Check className="h-3 w-3" /> Já compra</Badge> : <Badge variant="outline" className="gap-1 border-warning/40 text-warning text-[10px]"><X className="h-3 w-3" /> Gap</Badge>}</div><div className="text-right shrink-0 hidden md:block"><div className="text-xs text-muted-foreground">unidades</div><div className="font-semibold text-sm">{trend.unitsSold.toLocaleString("pt-BR")}</div></div><div className="text-right shrink-0 hidden lg:block"><div className="text-xs text-muted-foreground">preço médio</div><div className="font-semibold text-sm">{fmtBRL(trend.avgPrice)}</div></div><Trend.icon className={cn("h-4 w-4 shrink-0", Trend.className)} /></div>;
      })}
    </div>
  );
}

export function IndustryTrendingProducts({ ramoAtividade, clientId }: Props) {
  const { data, isLoading, isFetching: trendsFetching, isError, refetch } = useIndustryTrends(ramoAtividade, clientId);
  const affinityQuery = useClientAffinity(clientId);
  const { data: affinity } = affinityQuery;
  const { focusedSlug, focusedLabel } = useBICategoryFocus();
  const [onlyOpportunities, setOnlyOpportunities] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const effectiveCategory = focusedLabel ?? activeCategory;
  const affinityLoading = affinityQuery.isFetching || affinityQuery.isLoading;
  const contextLoading = trendsFetching || isLoading || affinityLoading;
  const failedSources = [
    ...(isError ? [{ label: "tendências do setor", refetch }] : []),
    ...(affinityQuery.isError ? [{ label: "afinidade de produtos do cliente", refetch: affinityQuery.refetch }] : []),
  ];
  const retryFailedSources = async () => {
    await Promise.all(failedSources.map((source) => source.refetch()));
  };

  // Set de assinaturas dos produtos que o cliente já compra (por id e por nome normalizado)
  const clientBuys = useMemo(() => {
    const ids = new Set<string>();
    const names = new Set<string>();
    affinity?.topProducts?.forEach((p) => {
      if (p.product_id) ids.add(p.product_id);
      if (p.product_name) names.add(normalize(p.product_name));
    });
    return { ids, names };
  }, [affinity]);

  // Categorias presentes (chips) — derivadas via resolver central
  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>();
    (data?.trends ?? []).forEach((t) => {
      const cat = resolveBICategoryLabel(t.productName, t.category);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [data]);

  const enriched = useMemo(() => {
    const items = (data?.trends ?? []).map((t) => {
      const alreadyBuys =
        (t.productId && clientBuys.ids.has(t.productId)) ||
        clientBuys.names.has(normalize(t.productName));
      const meta = resolveBICategory(t.productName, t.category);
      return { ...t, alreadyBuys, resolvedCategory: meta.label, resolvedSlug: meta.slug };
    });
    let filtered = onlyOpportunities ? items.filter((t) => !t.alreadyBuys) : items;
    if (focusedSlug) {
      filtered = filtered.filter((t) => t.resolvedSlug === focusedSlug);
    } else if (effectiveCategory) {
      filtered = filtered.filter((t) => t.resolvedCategory === effectiveCategory);
    }
    return { items, filtered };
  }, [data, clientBuys, onlyOpportunities, effectiveCategory, focusedSlug]);

  const opportunities = enriched.items.filter((t) => !t.alreadyBuys);
  const topOpportunities = opportunities.slice(0, 3);
  const opportunityCount = opportunities.length;
  const totalCount = enriched.items.length;

  if (contextLoading) return <ProductGridSkeleton rows={5} />;

  if (failedSources.length > 0) return <Card className="border-[1.5px]"><CardContent className="flex flex-col items-center gap-2 py-8 text-center" role="alert"><AlertCircle className="h-6 w-6 text-destructive" /><p className="text-sm text-destructive">{industryAvailabilityMessage(failedSources.map((source) => source.label), Boolean(affinityQuery.isError))}</p><Button variant="outline" size="sm" onClick={() => void retryFailedSources()}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Tentar novamente</Button></CardContent></Card>;

  return (
    <Card className="border-[1.5px]">
      <CardContent className="p-5 space-y-4">
        <IndustryHeader ramoAtividade={ramoAtividade} data={data} totalCount={totalCount} opportunityCount={opportunityCount} onlyOpportunities={onlyOpportunities} onOnlyOpportunitiesChange={setOnlyOpportunities} />
        <CategoryChips chips={categoryChips} activeCategory={activeCategory} totalCount={totalCount} onChange={setActiveCategory} />
        <OpportunityHeroes trends={topOpportunities} visible={topOpportunities.length > 0 && !onlyOpportunities} />
        <TrendRows trends={enriched.filtered} onlyOpportunities={onlyOpportunities} />
      </CardContent>
    </Card>
  );
}
