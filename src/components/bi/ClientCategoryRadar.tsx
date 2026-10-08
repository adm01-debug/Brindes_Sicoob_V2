/**
 * ClientCategoryRadar — Zona PROTAGONISTA do BI.
 *
 * Compara lado a lado:
 *  - "O que [Cliente] compra"  → top categorias por receita do cliente
 *  - "O que o setor compra"    → top categorias do ramo
 *
 * Destaca:
 *  - Categorias super-índex (cliente compra muito mais que o setor)
 *  - Categorias gap (setor compra muito, cliente nada/quase nada) → oportunidades
 *
 * Cada categoria expansível mostra produtos reais já comprados + sugestões.
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Radar,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Package,
  Users,
  HelpCircle,
  Focus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useClientCategoryAffinity, type CategoryAggregate } from "@/hooks/bi/useClientCategoryAffinity";
import {
  useIndustryCategoryTrends,
  type IndustryCategoryAggregate,
} from "@/hooks/bi/useIndustryCategoryTrends";
import type { BICategorySlug } from "@/lib/bi/categoryResolver";
import { useBICategoryFocus } from "@/contexts/BICategoryFocusContext";

interface Props {
  clientId: string;
  ramoAtividade: string | null;
  clientName?: string;
}

interface MergedRow {
  slug: BICategorySlug | "outros";
  label: string;
  clientShare: number;
  industryShare: number;
  ratio: number; // clientShare / industryShare
  status: "super" | "aligned" | "underindex" | "gap" | "client-only";
  clientCat?: CategoryAggregate;
  industryCat?: IndustryCategoryAggregate;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v.toFixed(0)}%`;

function classify(clientShare: number, industryShare: number): MergedRow["status"] {
  if (industryShare === 0 && clientShare > 0) return "client-only";
  if (clientShare === 0 && industryShare >= 8) return "gap";
  if (industryShare === 0) return "aligned";
  const ratio = clientShare / industryShare;
  if (ratio >= 1.8) return "super";
  if (ratio <= 0.4) return "underindex";
  return "aligned";
}

const STATUS_META: Record<MergedRow["status"], { label: string; chip: string; bar: string }> = {
  super: {
    label: "Super-índex",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    bar: "[&>div]:bg-emerald-500",
  },
  aligned: {
    label: "Alinhado",
    chip: "bg-muted text-muted-foreground border-border",
    bar: "[&>div]:bg-primary",
  },
  underindex: {
    label: "Sub-índex",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    bar: "[&>div]:bg-amber-500",
  },
  gap: {
    label: "GAP — Oportunidade",
    chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
    bar: "[&>div]:bg-violet-500",
  },
  "client-only": {
    label: "Exclusivo do cliente",
    chip: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    bar: "[&>div]:bg-blue-500",
  },
};

function rowScore(row: MergedRow) {
  const gapScore = row.status === "gap" ? 1000 : 0;
  const superScore = row.status === "super" ? 500 : 0;
  return gapScore + superScore + row.clientShare + row.industryShare;
}

function mergeCategories(
  clientCategories: CategoryAggregate[],
  industryCategories: IndustryCategoryAggregate[],
): MergedRow[] {
  const map = new Map<string, MergedRow>();
  for (const category of clientCategories) {
    map.set(category.slug, {
      slug: category.slug, label: category.label, clientShare: category.revenueSharePct,
      industryShare: 0, ratio: 0, status: "client-only", clientCat: category,
    });
  }
  for (const category of industryCategories) {
    const current = map.get(category.slug);
    if (current) {
      current.industryShare = category.revenueSharePct;
      current.industryCat = category;
      continue;
    }
    map.set(category.slug, {
      slug: category.slug, label: category.label, clientShare: 0,
      industryShare: category.revenueSharePct, ratio: 0, status: "gap", industryCat: category,
    });
  }
  return Array.from(map.values())
    .map((row) => ({
      ...row,
      ratio: row.industryShare > 0 ? row.clientShare / row.industryShare : 0,
      status: classify(row.clientShare, row.industryShare),
    }))
    .sort((left, right) => rowScore(right) - rowScore(left))
    .slice(0, 8);
}

function RadarLoading() {
  return (
    <Card className="border-[1.5px]">
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-6 w-72" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-20 rounded-xl" />)}
        </div>
      </CardContent>
    </Card>
  );
}

function RadarHelp({ isMock }: { isMock: boolean }) {
  const source = isMock ? "dados simulados (cliente sem histórico)" : "100% baseado em pedidos reais";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="Como o mapa funciona" className="text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
          <p className="font-semibold mb-1">Como ler este mapa</p>
          <p className="mb-1.5"><span className="font-medium">GAP:</span> categoria que move ≥8% do setor mas representa &lt;5% das compras do cliente — oportunidade clara.</p>
          <p className="mb-1.5"><span className="font-medium">Tendência ↑↓:</span> compara receita dos últimos 90 dias contra os 90 anteriores.</p>
          <p><span className="font-medium">Origem:</span> {source}.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface RadarHeaderProps {
  clientName?: string;
  ramoAtividade: string | null;
  isMock: boolean;
  opportunities: number;
  superIndex: number;
}

function RadarBadges({ isMock, opportunities, superIndex }: Pick<RadarHeaderProps, "isMock" | "opportunities" | "superIndex">) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
      {opportunities > 0 && <Badge className="gap-1 bg-violet-500 text-white text-[10px] hover:bg-violet-600"><Target className="h-3 w-3" />{opportunities} GAP</Badge>}
      {superIndex > 0 && <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px]"><TrendingUp className="h-3 w-3" />{superIndex} super-índex</Badge>}
      {isMock
        ? <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700 dark:text-amber-300 text-[10px]"><Sparkles className="h-3 w-3" /> Simulado</Badge>
        : <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-[10px]"><CheckCircle2 className="h-3 w-3" /> Dados reais</Badge>}
    </div>
  );
}

function RadarHeader(props: RadarHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0"><Radar className="h-5 w-5 text-primary" /></div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="font-display font-bold text-base sm:text-lg leading-tight">Mapa de Categorias — {props.clientName || "este cliente"}</h2>
            <RadarHelp isMock={props.isMock} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comparação direta: o que o cliente compra × o que o setor {props.ramoAtividade && <span className="font-medium">({props.ramoAtividade}) </span>}
            costuma comprar. Clique em uma categoria para focar todo o painel nela.
          </p>
        </div>
      </div>
      <RadarBadges {...props} />
    </div>
  );
}

function TrendIndicator({ category }: { category?: CategoryAggregate }) {
  if (category?.deltaPct === null || category?.deltaPct === undefined) return null;
  if (category.trend === "up") return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0" title={`Receita 90d vs 90d anteriores: +${Math.round(category.deltaPct)}%`}><TrendingUp className="h-3 w-3" />+{Math.round(category.deltaPct)}%</span>;
  if (category.trend === "down") return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400 tabular-nums shrink-0" title={`Receita 90d vs 90d anteriores: ${Math.round(category.deltaPct)}%`}><TrendingDown className="h-3 w-3" />{Math.round(category.deltaPct)}%</span>;
  if (category.trend === "stable") return <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground tabular-nums shrink-0" title="Receita estável nos últimos 90d"><Minus className="h-3 w-3" />estável</span>;
  return null;
}

function ComparisonBars({ row }: { row: MergedRow }) {
  const maxShare = Math.max(row.clientShare, row.industryShare, 1);
  const meta = STATUS_META[row.status];
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-[10px] text-muted-foreground"><span className="uppercase tracking-wider font-medium">Cliente</span><span className="font-bold tabular-nums text-foreground">{fmtPct(row.clientShare)}</span></div>
        <Progress value={(row.clientShare / maxShare) * 100} className={cn("h-2", meta.bar)} />
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-[10px] text-muted-foreground"><span className="uppercase tracking-wider font-medium">Setor</span><span className="font-bold tabular-nums text-foreground">{fmtPct(row.industryShare)}</span></div>
        <Progress value={(row.industryShare / maxShare) * 100} className="h-2 [&>div]:bg-muted-foreground/60" />
      </div>
    </div>
  );
}

function RowInsight({ row }: { row: MergedRow }) {
  if (row.status === "gap") return <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">⚡ O setor investe {fmtPct(row.industryShare)} aqui — este cliente, nada.</p>;
  if (row.status === "super") return <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">🔥 Cliente compra {row.ratio.toFixed(1)}× mais que a média do setor.</p>;
  if (row.status === "underindex") return <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">↘ Cliente compra abaixo do padrão do setor — espaço para crescer.</p>;
  return null;
}

function ClientProducts({ category }: { category?: CategoryAggregate }) {
  if (!category?.topProducts.length) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium"><Package className="h-3 w-3" />Já comprados pelo cliente</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {category.topProducts.slice(0, 3).map((product, index) => <div key={`${product.productId ?? index}`} className="p-2 rounded-md bg-muted/40 border text-xs"><div className="font-medium line-clamp-2 leading-tight min-h-[2rem]">{product.productName}</div><div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground"><span>{product.quantity.toLocaleString("pt-BR")} un</span><span className="font-semibold text-foreground">{fmtBRL(product.revenue)}</span></div></div>)}
      </div>
    </div>
  );
}

function IndustryProducts({ category }: { category?: IndustryCategoryAggregate }) {
  if (!category?.topProducts.length) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium"><Users className="h-3 w-3" />Top do setor nesta categoria</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {category.topProducts.slice(0, 3).map((product, index) => <div key={`${product.productId ?? index}-ind`} className="p-2 rounded-md bg-violet-500/5 border border-violet-500/20 text-xs"><div className="font-medium line-clamp-2 leading-tight min-h-[2rem]">{product.productName}</div><div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground"><span>{product.quantity.toLocaleString("pt-BR")} un</span><span className="font-semibold text-foreground">{fmtBRL(product.avgPrice)}</span></div></div>)}
      </div>
    </div>
  );
}

interface CategoryRowProps {
  row: MergedRow;
  isOpen: boolean;
  isFocused: boolean;
  onOpenChange: (open: boolean) => void;
  onFocus: () => void;
  onDrillDown: () => void;
}

function RowActions({ row, isFocused, onFocus, onDrillDown }: Omit<CategoryRowProps, "isOpen" | "onOpenChange">) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Button size="sm" variant={isFocused ? "default" : "outline"} className={cn("gap-1.5", isFocused && "bg-violet-600 hover:bg-violet-700 text-white")} onClick={onFocus}>
        <Focus className="h-3.5 w-3.5" />{isFocused ? "Remover foco" : "Focar painel nesta categoria"}
      </Button>
      <Button size="sm" variant={row.status === "gap" ? "default" : "outline"} className="gap-1.5" onClick={onDrillDown}>
        {row.status === "gap" ? "Explorar no orçamento" : "Reabrir no orçamento"}<ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function CategoryRow(props: CategoryRowProps) {
  const { row, isOpen, isFocused } = props;
  const meta = STATUS_META[row.status];
  const border = isFocused
    ? "border-violet-500 ring-2 ring-violet-500/30 shadow-md"
    : isOpen ? "border-primary/40 shadow-sm" : "border-border hover:border-primary/30";
  return (
    <Collapsible open={isOpen} onOpenChange={props.onOpenChange}>
      <div className={cn("rounded-xl border-[1.5px] bg-background/70 backdrop-blur transition-all", border)}>
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full p-3 sm:p-4 text-left flex flex-col gap-2.5 group">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0"><span className="font-display font-semibold text-sm sm:text-base truncate">{row.label}</span><TrendIndicator category={row.clientCat} /><Badge variant="outline" className={cn("text-[10px] gap-1 shrink-0", meta.chip)}>{meta.label}</Badge></div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
            </div>
            <ComparisonBars row={row} />
            <RowInsight row={row} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 border-t pt-3">
            <ClientProducts category={row.clientCat} />
            <IndustryProducts category={row.industryCat} />
            <RowActions {...props} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface CategoryListProps {
  rows: MergedRow[];
  expanded: string | null;
  focusedSlug: BICategorySlug | "outros" | null;
  setExpanded: (slug: string | null) => void;
  setFocus: (slug: BICategorySlug | "outros" | null, label: string | null) => void;
  onDrillDown: (row: MergedRow) => void;
}

function CategoryList(props: CategoryListProps) {
  if (props.rows.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">Sem histórico suficiente para comparar categorias.</p>;
  return (
    <div className="space-y-2">
      {props.rows.map((row) => {
        const isFocused = props.focusedSlug === row.slug;
        return <CategoryRow key={row.slug} row={row} isOpen={props.expanded === row.slug} isFocused={isFocused} onOpenChange={(open) => props.setExpanded(open ? row.slug : null)} onFocus={() => props.setFocus(isFocused ? null : row.slug, isFocused ? null : row.label)} onDrillDown={() => props.onDrillDown(row)} />;
      })}
    </div>
  );
}

export function ClientCategoryRadar({ clientId, ramoAtividade, clientName }: Props) {
  const navigate = useNavigate();
  const client = useClientCategoryAffinity(clientId);
  const industry = useIndustryCategoryTrends(ramoAtividade);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { focusedSlug, setFocus } = useBICategoryFocus();
  const rows = useMemo(() => mergeCategories(client.categories, industry.categories), [client.categories, industry.categories]);
  const isMock = client.isMock || industry.isMock;
  const handleDrillDown = (row: MergedRow) => {
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);
    if (row.label) params.set("category", row.label);
    navigate(`/orcamentos/novo?${params.toString()}`);
  };
  if (client.isLoading || industry.isLoading) return <RadarLoading />;
  const header = {
    clientName, ramoAtividade, isMock,
    opportunities: rows.filter((row) => row.status === "gap").length,
    superIndex: rows.filter((row) => row.status === "super").length,
  };
  return (
    <Card className="border-[1.5px] ring-1 ring-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-5">
        <RadarHeader {...header} />
        <CategoryList rows={rows} expanded={expanded} focusedSlug={focusedSlug} setExpanded={setExpanded} setFocus={setFocus} onDrillDown={handleDrillDown} />
      </CardContent>
    </Card>
  );
}
