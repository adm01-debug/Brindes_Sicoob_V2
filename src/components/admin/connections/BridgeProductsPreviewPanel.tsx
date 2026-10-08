import { isNullish } from "@/components/admin/utils/nullish";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExternalProducts } from "@/hooks/useExternalDatabase";
import type { ExternalProduct } from "@/lib/external-db/types";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
type ActiveFilter = "all" | "active" | "inactive";

const fmtCurrency = (n?: number) =>
  typeof n === "number"
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)
    : "—";

function parseFilterNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ActiveBadge({ active }: { active?: boolean | null }) {
  if (active === true) return <Badge variant="default" className="text-[10px]">Sim</Badge>;
  if (active === false) return <Badge variant="secondary" className="text-[10px]">Não</Badge>;
  return <span className="text-xs text-muted-foreground">—</span>;
}

function ProductsTable({ loading, products }: { loading: boolean; products: ExternalProduct[] }) {
  let rows;
  if (loading && products.length === 0) {
    rows = Array.from({ length: 5 }).map((_, index) => <tr key={`skel-${index}`} className="border-t"><td colSpan={7} className="px-3 py-2"><Skeleton className="h-5 w-full" /></td></tr>);
  } else if (products.length === 0) {
    rows = <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado com os filtros atuais.</td></tr>;
  } else {
    rows = products.map((product) => <tr key={product.id} className="border-t hover:bg-muted/30 transition-colors">
      <td className="px-3 py-2 max-w-[280px] truncate" title={product.name}>{product.name || <span className="text-muted-foreground">(sem nome)</span>}</td>
      <td className="px-3 py-2 font-mono text-xs">{product.sku ?? "—"}</td><td className="px-3 py-2 text-xs">{product.brand ?? "—"}</td>
      <td className="px-3 py-2 text-right tabular-nums">{fmtCurrency(product.price)}</td><td className="px-3 py-2 text-right tabular-nums">{product.stock ?? "—"}</td>
      <td className="px-3 py-2 text-center"><ActiveBadge active={product.is_active} /></td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{product.updated_at ? new Date(product.updated_at).toLocaleString("pt-BR") : "—"}</td>
    </tr>);
  }
  return (
    <div className="rounded-lg border overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
      <thead className="bg-muted/50 text-xs"><tr><th className="px-3 py-2 text-left font-medium">Nome</th><th className="px-3 py-2 text-left font-medium">SKU</th><th className="px-3 py-2 text-left font-medium">Marca</th><th className="px-3 py-2 text-right font-medium">Preço</th><th className="px-3 py-2 text-right font-medium">Estoque</th><th className="px-3 py-2 text-center font-medium">Ativo</th><th className="px-3 py-2 text-left font-medium">Atualizado</th></tr></thead>
      <tbody>{rows}</tbody>
    </table></div></div>
  );
}

interface PaginationBarProps {
  count: number | null;
  end: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  page: number;
  pageSize: PageSize;
  productCount: number;
  start: number;
  totalPages: number;
}

function resultCount(props: PaginationBarProps): string {
  if (props.loading && props.productCount === 0) return "Carregando…";
  if (!isNullish(props.count)) return `${props.start}–${props.end} de ${props.count.toLocaleString("pt-BR")} produto(s)`;
  return `${props.productCount} produto(s) carregado(s)`;
}

function PaginationBar(props: PaginationBarProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="text-xs text-muted-foreground tabular-nums">{resultCount(props)}</div>
      <div className="flex items-center gap-2"><Label htmlFor="bridge-products-page-size" className="text-xs">Por página</Label>
        <Select value={String(props.pageSize)} onValueChange={(value) => { props.onPageSizeChange(Number(value) as PageSize); props.onPageChange(1); }}>
          <SelectTrigger id="bridge-products-page-size" className="h-8 w-[80px]"><SelectValue /></SelectTrigger><SelectContent>{PAGE_SIZE_OPTIONS.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-1 ml-2">
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => props.onPageChange(Math.max(1, props.page - 1))} disabled={props.loading || props.page <= 1} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-xs tabular-nums px-2 min-w-[80px] text-center">{props.page} / {props.totalPages}</span>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => props.onPageChange(Math.min(props.totalPages, props.page + 1))} disabled={props.loading || props.page >= props.totalPages} aria-label="Próxima página"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function PreviewHeader({ loading, onReload }: { loading: boolean; onReload: () => void }) {
  return (
    <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Boxes className="h-5 w-5 text-primary" aria-hidden="true" /></div>
        <div><CardTitle className="text-base">Produtos preenchidos (external-db-bridge)</CardTitle><CardDescription className="text-xs">Pré-visualização paginada da tabela <code className="px-1 rounded bg-muted">products</code> retornada pela edge function. Filtros e paginação são aplicados server-side.</CardDescription></div>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onReload} disabled={loading} aria-label="Recarregar lista de produtos">
        {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}Recarregar
      </Button>
    </div></CardHeader>
  );
}

interface FilterPanelProps {
  active: ActiveFilter;
  applied: { search: string; active: ActiveFilter; minPrice: number | null; maxPrice: number | null; minStock: number | null };
  hasActive: boolean;
  maxPrice: string;
  minPrice: string;
  minStock: string;
  onActiveChange: (value: ActiveFilter) => void;
  onApply: () => void;
  onClear: () => void;
  onMaxPriceChange: (value: string) => void;
  onMinPriceChange: (value: string) => void;
  onMinStockChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  search: string;
}

function activeFilterCount(applied: FilterPanelProps["applied"]): number {
  return [
    applied.search.length > 0,
    applied.active !== "all",
    !isNullish(applied.minPrice),
    !isNullish(applied.maxPrice),
    !isNullish(applied.minStock),
  ].filter(Boolean).length;
}

function FilterPanel(props: FilterPanelProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-5 space-y-1.5"><Label htmlFor="bridge-products-search" className="text-xs">Busca (nome, SKU, marca, descrição)</Label><div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input id="bridge-products-search" value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") props.onApply(); }} placeholder="Ex: caneca, brinde, ABC123…" className="pl-7 h-9" /></div></div>
        <div className="md:col-span-2 space-y-1.5"><Label htmlFor="bridge-products-active" className="text-xs">Status</Label><Select value={props.active} onValueChange={(value) => props.onActiveChange(value as ActiveFilter)}><SelectTrigger id="bridge-products-active" className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Apenas ativos</SelectItem><SelectItem value="inactive">Apenas inativos</SelectItem></SelectContent></Select></div>
        <div className="md:col-span-2 space-y-1.5"><Label htmlFor="bridge-products-min-price" className="text-xs">Preço mín.</Label><Input id="bridge-products-min-price" type="number" inputMode="decimal" min={0} step="0.01" value={props.minPrice} onChange={(event) => props.onMinPriceChange(event.target.value)} placeholder="0,00" className="h-9" /></div>
        <div className="md:col-span-2 space-y-1.5"><Label htmlFor="bridge-products-max-price" className="text-xs">Preço máx.</Label><Input id="bridge-products-max-price" type="number" inputMode="decimal" min={0} step="0.01" value={props.maxPrice} onChange={(event) => props.onMaxPriceChange(event.target.value)} placeholder="—" className="h-9" /></div>
        <div className="md:col-span-1 space-y-1.5"><Label htmlFor="bridge-products-min-stock" className="text-xs">Estoque ≥</Label><Input id="bridge-products-min-stock" type="number" inputMode="numeric" min={0} step={1} value={props.minStock} onChange={(event) => props.onMinStockChange(event.target.value)} placeholder="0" className="h-9" /></div>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{props.hasActive ? <Badge variant="secondary" className="text-[10px]">{activeFilterCount(props.applied)} filtro(s) ativo(s)</Badge> : <span>Sem filtros aplicados</span>}</div>
        <div className="flex items-center gap-2"><Button type="button" size="sm" variant="ghost" onClick={props.onClear} disabled={!props.hasActive && props.search === "" && props.active === "all"}><X className="h-4 w-4 mr-1" />Limpar</Button><Button type="button" size="sm" onClick={props.onApply}><Search className="h-4 w-4 mr-1" />Buscar</Button></div>
      </div>
    </div>
  );
}

/**
 * Painel de revisão rápida dos produtos retornados pelo `external-db-bridge`
 * (operação `select` na tabela `products`). Permite filtrar por busca livre,
 * ativos/inativos, faixa de preço e estoque mínimo, com paginação server-side
 * (limit/offset) e contagem exata para revisar o catálogo externo sem precisar
 * acessar o BD diretamente.
 */
export function BridgeProductsPreviewPanel() {
  const { data, count, isLoading, error, fetchAll } = useExternalProducts();

  // ---- Filtros (controlados via inputs, aplicados ao "Buscar") ----
  const [searchInput, setSearchInput] = useState("");
  const [activeInput, setActiveInput] = useState<ActiveFilter>("all");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [minStockInput, setMinStockInput] = useState("");

  // Filtros aplicados (acionam o fetch)
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedActive, setAppliedActive] = useState<ActiveFilter>("all");
  const [appliedMinPrice, setAppliedMinPrice] = useState<number | null>(null);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number | null>(null);
  const [appliedMinStock, setAppliedMinStock] = useState<number | null>(null);

  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);

  const totalPages = useMemo(() => {
    if (isNullish(count)) return 1;
    return Math.max(1, Math.ceil(count / pageSize));
  }, [count, pageSize]);

  // Monta o objeto de filtros no formato suportado pelo external-db-bridge
  const buildFilters = useCallback((): Record<string, unknown> => {
    const f: Record<string, unknown> = {};
    if (appliedSearch.trim().length > 0) f._search = appliedSearch.trim();
    if (appliedActive === "active") f.is_active = true;
    if (appliedActive === "inactive") f.is_active = false;
    if (!isNullish(appliedMinPrice)) f.price_gte = appliedMinPrice;
    if (!isNullish(appliedMaxPrice)) f.price_lte = appliedMaxPrice;
    if (!isNullish(appliedMinStock)) f.stock_gte = appliedMinStock;
    return f;
  }, [appliedSearch, appliedActive, appliedMinPrice, appliedMaxPrice, appliedMinStock]);

  // Carrega a página atual sempre que filtros, paginação ou tamanho mudam
  const lastReqRef = useRef(0);
  const loadPage = useCallback(async () => {
    const reqId = ++lastReqRef.current;
    await fetchAll({
      filters: buildFilters(),
      select: "id,name,sku,price,stock,is_active,brand,supplier_id,updated_at",
      orderBy: { column: "updated_at", ascending: false },
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    if (reqId !== lastReqRef.current) return;
  }, [buildFilters, fetchAll, page, pageSize]);
  useEffect(() => { void loadPage(); }, [loadPage]);

  const handleApplyFilters = useCallback(() => {
    setAppliedSearch(searchInput);
    setAppliedActive(activeInput);
    setAppliedMinPrice(parseFilterNumber(minPriceInput));
    setAppliedMaxPrice(parseFilterNumber(maxPriceInput));
    setAppliedMinStock(parseFilterNumber(minStockInput));
    setPage(1);
  }, [searchInput, activeInput, minPriceInput, maxPriceInput, minStockInput]);

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    setActiveInput("all");
    setMinPriceInput("");
    setMaxPriceInput("");
    setMinStockInput("");
    setAppliedSearch("");
    setAppliedActive("all");
    setAppliedMinPrice(null);
    setAppliedMaxPrice(null);
    setAppliedMinStock(null);
    setPage(1);
  }, []);

  const hasActiveFilters =
    (appliedSearch.length > 0 ||
    appliedActive !== "all" ||
    !isNullish(appliedMinPrice) ||
    !isNullish(appliedMaxPrice) ||
    !isNullish(appliedMinStock));

  const products = data as ExternalProduct[];
  const startIdx = (count === 0 ? 0 : (page - 1) * pageSize + 1);
  const endIdx = Math.min((page - 1) * pageSize + products.length, (count ?? 0));

  return (
    <Card>
      <PreviewHeader loading={isLoading} onReload={() => { void loadPage(); }} />

      <CardContent className="space-y-4">
        <FilterPanel active={activeInput}
          applied={{ search: appliedSearch, active: appliedActive, minPrice: appliedMinPrice, maxPrice: appliedMaxPrice, minStock: appliedMinStock }}
          hasActive={hasActiveFilters} maxPrice={maxPriceInput} minPrice={minPriceInput} minStock={minStockInput}
          onActiveChange={setActiveInput} onApply={handleApplyFilters} onClear={handleClearFilters}
          onMaxPriceChange={setMaxPriceInput} onMinPriceChange={setMinPriceInput}
          onMinStockChange={setMinStockInput} onSearchChange={setSearchInput} search={searchInput} />

        {/* ---- Resultados ---- */}
        {(error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            Falha ao consultar a edge function: {error}
          </div>
        ) : null)}

        <ProductsTable loading={isLoading} products={products} />
        <PaginationBar count={count} end={endIdx} loading={isLoading} onPageChange={setPage}
          onPageSizeChange={setPageSize} page={page} pageSize={pageSize} productCount={products.length}
          start={startIdx} totalPages={totalPages} />
      </CardContent>
    </Card>
  );
}
