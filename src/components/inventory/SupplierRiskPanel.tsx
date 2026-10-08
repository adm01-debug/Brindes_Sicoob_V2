/**
 * SupplierRiskPanel — Orchestrator for supplier risk dashboard.
 * v4: Refactored into smaller components (SRP compliance).
 * Sub-components: risk/ProductRiskDetail, risk/RiskKpi, risk/RiskTooltip, risk/types
 */
import { useMemo, useState, useEffect, useRef, type RefObject } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Package,
  Clock,
  Search,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ProductStockSummary } from "@/types/stock";
import { ProductRiskDetail } from "./risk/ProductRiskDetail";
import { deriveSeverity, SEVERITY_ORDER, type RiskProduct, type RiskSeverity } from "./risk/types";

// ---------- Main Panel ----------

interface SupplierRiskPanelProps {
  products: ProductStockSummary[];
}

function toRiskProducts(products: ProductStockSummary[]) {
  return products.map((product) => ({ id: product.productId, name: product.productName, sku: product.productSku, currentStock: product.totalCurrentStock, minStock: product.totalMinStock, severity: deriveSeverity(product), status: product.overallStatus, variantsCritical: product.variantsCritical, variantsOutOfStock: product.variantsOutOfStock, totalVariants: product.totalVariants }))
    .sort((left, right) => SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] || left.currentStock - right.currentStock);
}

function riskCounts(products: RiskProduct[]) {
  return products.reduce((counts, product) => ({ ...counts, [product.severity]: counts[product.severity] + 1 }), { critical: 0, warning: 0, ok: 0, total: products.length });
}

function latestStockUpdate(products: ProductStockSummary[]) {
  const updates = products.flatMap((product) => product.variants.map((variant) => variant.updatedAt).filter((value): value is string => Boolean(value)));
  if (updates.length === 0) return null;
  const sorted = updates.sort();
  try { return format(new Date(sorted[sorted.length - 1] ?? ""), "dd/MM HH:mm", { locale: ptBR }); }
  catch { return null; }
}

function useRiskData(products: ProductStockSummary[]) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<RiskSeverity | "all">("all");
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(searchInput), 300); return () => clearTimeout(timer); }, [searchInput]);
  const riskProducts = useMemo(() => toRiskProducts(products), [products]);
  const globalCounts = useMemo(() => riskCounts(riskProducts), [riskProducts]);
  const filteredProducts = useMemo(() => riskProducts.filter((product) => !debouncedSearch || product.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || product.sku.toLowerCase().includes(debouncedSearch.toLowerCase())).filter((product) => severityFilter === "all" || product.severity === severityFilter), [riskProducts, debouncedSearch, severityFilter]);
  const filteredCounts = useMemo(() => riskCounts(filteredProducts), [filteredProducts]);
  useEffect(() => { setSelectedProductId((current) => filteredProducts.some((product) => product.id === current) ? current : filteredProducts[0]?.id ?? null); }, [filteredProducts]);
  const selected = filteredProducts.find((product) => product.id === selectedProductId) ?? null;
  const lastUpdated = useMemo(() => latestStockUpdate(products), [products]);
  return { selectedProductId, setSelectedProductId, searchInput, setSearchInput, debouncedSearch, severityFilter, setSeverityFilter, riskProducts, globalCounts, filteredProducts, filteredCounts, selected, lastUpdated };
}

function EmptyRiskPanel() {
  return <Card><CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center"><ShieldAlert className="h-4 w-4 text-warning" aria-hidden="true" /></div>Risco de Ruptura no Fornecedor</CardTitle></CardHeader><CardContent><div className="flex flex-col items-center justify-center py-12 text-center gap-3"><div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center"><Package className="h-7 w-7 text-muted-foreground/40" /></div><div><p className="font-semibold text-foreground mb-1">Sem dados disponíveis</p><p className="text-sm text-muted-foreground max-w-xs">Carregue os dados de estoque para visualizar a análise de risco por fornecedor.</p></div></div></CardContent></Card>;
}

function RiskPanelHeader({ data }: { data: ReturnType<typeof useRiskData> }) {
  return <CardHeader className="pb-3"><div className="flex items-center justify-between flex-wrap gap-2"><div><CardTitle className="text-lg flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center"><ShieldAlert className="h-4 w-4 text-warning" aria-hidden="true" /></div>Risco de Ruptura no Fornecedor{data.globalCounts.critical > 0 && <Badge variant="destructive" className="text-[10px] animate-pulse">{data.globalCounts.critical} crítico{data.globalCounts.critical > 1 ? "s" : ""}</Badge>}</CardTitle><CardDescription className="mt-1">Monitore produtos com risco de acabar no fornecedor — antecipe compras e evite perder vendas</CardDescription></div>{data.lastUpdated && <span className="text-[10px] text-muted-foreground flex items-center gap-1" aria-label={`Última atualização: ${data.lastUpdated}`}><Clock className="h-3 w-3" aria-hidden="true" />{data.lastUpdated}</span>}</div></CardHeader>;
}

const SEVERITY_OPTIONS = [
  { value: "all" as const, label: "Todos" }, { value: "critical" as const, label: "Críticos" },
  { value: "warning" as const, label: "Atenção" }, { value: "ok" as const, label: "OK" },
];

function SeverityFilters({ data }: { data: ReturnType<typeof useRiskData> }) {
  const count = (value: RiskSeverity | "all") => value === "all" ? data.riskProducts.length : data.globalCounts[value];
  const activeClass = (value: RiskSeverity | "all") => value === "critical" ? "bg-destructive/15 text-destructive" : value === "warning" ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary";
  return <div className="flex gap-1 flex-wrap" role="radiogroup" aria-label="Filtrar por severidade">{SEVERITY_OPTIONS.map((option) => <button key={option.value} onClick={() => data.setSeverityFilter(option.value)} className={cn("text-[9px] px-2 py-0.5 rounded-full transition-colors", data.severityFilter === option.value ? activeClass(option.value) : "text-muted-foreground hover:bg-muted/50")} aria-checked={data.severityFilter === option.value} role="radio">{option.label} ({count(option.value)})</button>)}</div>;
}

function RiskProductRow({ product, selected, virtualRow, onSelect }: { product: RiskProduct; selected: boolean; virtualRow: { size: number; start: number }; onSelect: () => void }) {
  const severityClass = product.severity === "critical" ? "bg-destructive/15 text-destructive border-destructive/30" : product.severity === "warning" ? "bg-warning/15 text-warning border-warning/30" : "bg-primary/10 text-primary border-primary/20";
  const label = product.severity === "critical" ? "Crítico" : product.severity === "warning" ? "Atenção" : "OK";
  return <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}><button onClick={onSelect} role="option" aria-selected={selected} className={cn("w-full text-left p-2 rounded-lg text-xs transition-colors", selected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50")}><div className="flex items-center justify-between gap-1"><div className="min-w-0 flex-1"><span className="font-medium truncate block">{product.name}</span><span className="text-[9px] text-muted-foreground">{product.sku}</span></div><div className="flex items-center gap-1.5 shrink-0"><span className="text-[9px] text-muted-foreground">{product.currentStock} un</span><Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", severityClass)}>{product.severity === "critical" && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}{label}</Badge></div></div></button></div>;
}

function VirtualRiskList({ data, parentRef, virtualizer }: { data: ReturnType<typeof useRiskData>; parentRef: RefObject<HTMLDivElement>; virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>> }) {
  return <div ref={parentRef} className="h-[250px] sm:h-[300px] overflow-auto" role="listbox" aria-label="Lista de produtos com risco">{data.filteredProducts.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">{data.debouncedSearch ? "Nenhum produto encontrado" : "Nenhum produto nesta categoria"}</p> : <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>{virtualizer.getVirtualItems().map((virtualRow) => { const product = data.filteredProducts[virtualRow.index]; return product ? <RiskProductRow key={product.id} product={product} selected={data.selectedProductId === product.id} virtualRow={virtualRow} onSelect={() => data.setSelectedProductId(product.id)} /> : null; })}</div>}</div>;
}

function RiskSummary({ counts }: { counts: ReturnType<typeof riskCounts> }) {
  return <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border">{(["critical", "warning", "ok"] as const).map((severity) => { const label = severity === "critical" ? "Críticos" : severity === "warning" ? "Atenção" : "OK"; const style = severity === "critical" ? "bg-destructive/10 text-destructive" : severity === "warning" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"; return <div key={severity} className={cn("text-center p-1.5 rounded", style.split(" ")[0])} role="status" aria-label={`${counts[severity]} produtos ${label.toLowerCase()}`}><p className={cn("text-lg font-bold", style.split(" ")[1])}>{counts[severity]}</p><p className={cn("text-[9px]", style.split(" ")[1])}>{label}</p></div>; })}</div>;
}

export function SupplierRiskPanel({ products }: SupplierRiskPanelProps) {
  const data = useRiskData(products);
  const listParentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: data.filteredProducts.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  if (!products.length) return <EmptyRiskPanel />;

  return (
    <Card>
      <RiskPanelHeader data={data} />
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Product list */}
          <div className="space-y-2">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /><Input placeholder="Buscar produto ou SKU..." value={data.searchInput} onChange={(event) => data.setSearchInput(event.target.value)} className="pl-8 h-8 text-xs" aria-label="Buscar produto no painel de risco" /></div>
            <SeverityFilters data={data} />
            <VirtualRiskList data={data} parentRef={listParentRef} virtualizer={virtualizer} />
            <RiskSummary counts={data.filteredCounts} />
          </div>

          {/* Detail panel */}
          <div className="border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-4">
            {data.selected ? (
              <ProductRiskDetail productId={data.selected.id} productName={data.selected.name} productSku={data.selected.sku} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-8">
                Selecione um produto para ver os detalhes de risco
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
