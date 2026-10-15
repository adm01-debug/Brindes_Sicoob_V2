/**
 * ReplenishmentToolbar — Header, search, filters, and active-filter chips
 * for the Replenishment grid.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw, Search, X, CheckSquare, Loader2,
  Building2, FolderTree, ArrowUpDown,
} from "lucide-react";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { cn } from "@/lib/utils";
import type { ColumnCount } from "@/components/products/ColumnSelector";

type ViewMode = "grid" | "list" | "table";
type SortMode = "name" | "price-asc" | "price-desc" | "newest" | "stock";

interface SupplierOption { id: string; name: string; count: number; }
interface CategoryOption { id: string; name: string; count: number; }

interface ReplenishmentToolbarProps {
  // Counts
  totalCount: number;
  filteredCount: number;
  isLoading: boolean;
  isFetching: boolean;
  // Search
  searchQuery: string;
  onSearchChange: (q: string) => void;
  // Filters
  selectedSupplier: string;
  onSupplierChange: (v: string) => void;
  suppliers: SupplierOption[];
  selectedCategory: string;
  onCategoryChange: (v: string) => void;
  categories: CategoryOption[];
  sortMode: SortMode;
  onSortChange: (v: SortMode) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  // View
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  gridColumns: ColumnCount;
  setGridColumns: (c: ColumnCount) => void;
  // Selection
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
}

function ReplenishmentHeader({ props }: { props: ReplenishmentToolbarProps }) {
  const count = props.isLoading && props.totalCount === 0
    ? <span className="flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />carregando…</span>
    : <>{props.filteredCount}{props.hasActiveFilters ? <span className="text-muted-foreground">/{props.totalCount}</span> : null}</>;
  return <div className="flex items-center gap-2 flex-wrap"><div className="flex items-center gap-2 flex-1 min-w-0"><RefreshCw className="h-4 w-4 text-info shrink-0" aria-hidden="true" /><h2 className="text-base sm:text-lg font-semibold whitespace-nowrap">Reposição</h2><Badge variant="secondary" className="text-[10px] tabular-nums px-1.5 shrink-0">{count}</Badge>{props.isFetching && props.totalCount > 0 ? <span role="status" aria-label="Atualizando produtos"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" /></span> : null}
    <div className="hidden sm:block w-80 lg:w-[25rem]"><SearchInput value={props.searchQuery} onChange={props.onSearchChange} placeholder="Buscar reposições…  /" /></div></div>
    <Button variant={props.selectionMode ? "default" : "outline"} size="sm" className={cn("h-8 text-xs gap-1.5 shrink-0 transition-all", props.selectionMode && "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]")} onClick={props.onToggleSelectionMode} aria-pressed={props.selectionMode}><CheckSquare className="h-3.5 w-3.5" aria-hidden="true" /><span className="hidden sm:inline">{props.selectionMode ? "Cancelar" : "Selecionar"}</span></Button>
    <LayoutPopover viewMode={props.viewMode} setViewMode={props.setViewMode} gridColumns={props.gridColumns} setGridColumns={props.setGridColumns} />
  </div>;
}

function ReplenishmentFilters({ props }: { props: ReplenishmentToolbarProps }) {
  return <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Filtros de reposição">
    <Select value={props.selectedSupplier} onValueChange={props.onSupplierChange}><SelectTrigger className="w-[160px] h-7 text-[11px] gap-1" aria-label="Filtrar por fornecedor"><Building2 className="h-3 w-3 shrink-0" aria-hidden="true" /><SelectValue placeholder="Fornecedor" /></SelectTrigger><SelectContent><SelectItem value="all">Todos fornecedores</SelectItem>{props.suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.count})</SelectItem>)}</SelectContent></Select>
    <Select value={props.selectedCategory} onValueChange={props.onCategoryChange}><SelectTrigger className="w-[160px] h-7 text-[11px] gap-1" aria-label="Filtrar por categoria"><FolderTree className="h-3 w-3 shrink-0" aria-hidden="true" /><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent><SelectItem value="all">Todas categorias</SelectItem>{props.categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name} ({category.count})</SelectItem>)}</SelectContent></Select>
    <Select value={props.sortMode} onValueChange={(value) => props.onSortChange(value as SortMode)}><SelectTrigger className="w-[180px] h-7 text-[11px] gap-1" aria-label="Ordenar produtos"><ArrowUpDown className="h-3 w-3" aria-hidden="true" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name">Nome (A-Z)</SelectItem><SelectItem value="price-asc">Preço (Menor → Maior)</SelectItem><SelectItem value="price-desc">Preço (Maior → Menor)</SelectItem><SelectItem value="newest">Mais Recentes</SelectItem><SelectItem value="stock">Maior Estoque</SelectItem></SelectContent></Select>
    {props.hasActiveFilters ? <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground" onClick={props.onClearFilters} aria-label="Limpar todos os filtros"><X className="h-3 w-3 mr-0.5" aria-hidden="true" />Limpar</Button> : null}
  </div>;
}

function ActiveFilterChips({ props }: { props: ReplenishmentToolbarProps }) {
  if (!props.hasActiveFilters) return null;
  const supplier = props.suppliers.find((item) => item.id === props.selectedSupplier)?.name;
  const category = props.categories.find((item) => item.id === props.selectedCategory)?.name;
  return <div className="flex flex-wrap gap-1" role="list" aria-label="Filtros ativos">{props.searchQuery.trim() ? <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => props.onSearchChange("")} aria-label={`Remover filtro: ${props.searchQuery}`}><Search className="h-2.5 w-2.5" aria-hidden="true" />"{props.searchQuery}"<X className="h-2.5 w-2.5" aria-hidden="true" /></Badge> : null}{props.selectedSupplier !== "all" ? <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => props.onSupplierChange("all")} aria-label="Remover filtro de fornecedor"><Building2 className="h-2.5 w-2.5" aria-hidden="true" />{supplier}<X className="h-2.5 w-2.5" aria-hidden="true" /></Badge> : null}{props.selectedCategory !== "all" ? <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => props.onCategoryChange("all")} aria-label="Remover filtro de categoria"><FolderTree className="h-2.5 w-2.5" aria-hidden="true" />{category}<X className="h-2.5 w-2.5" aria-hidden="true" /></Badge> : null}</div>;
}

export function ReplenishmentToolbar(props: ReplenishmentToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
      <ReplenishmentHeader props={props} />

      {/* Mobile Search */}
      <div className="flex items-center gap-2 w-full sm:hidden">
        <SearchInput value={props.searchQuery} onChange={props.onSearchChange} placeholder="Buscar reposições…" />
      </div>
      <ReplenishmentFilters props={props} />
      <ActiveFilterChips props={props} />
    </div>
  );
}

/** Small reusable search input */
function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs pl-8 bg-muted/40 border-border/50 focus:bg-background"
        aria-label="Buscar reposições"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Limpar busca"
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
