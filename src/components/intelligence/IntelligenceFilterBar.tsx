import { useState, useMemo } from "react";
import { Filter, X, ChevronDown, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCategories } from "@/hooks/useCategories";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProductsLightweight, type ProductLightweight } from "@/hooks/useProductsLightweight";
import { cn } from "@/lib/utils";

export interface IntelligenceFilters {
  days: number;
  categoryId: string | null;
  categoryName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  productId: string | null;
  productName: string | null;
}

const FILTER_BUTTON_CLASS = "h-8 gap-1.5 text-xs";
const ACTIVE_FILTER_CLASS = "border-primary/50 bg-primary/5 text-primary";
const SELECTED_PRODUCT_CLASS = "font-semibold text-primary";

interface IntelligenceFilterBarProps {
  filters: IntelligenceFilters;
  onFiltersChange: (filters: IntelligenceFilters) => void;
}

const PERIOD_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "15d", days: 15 },
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
  { label: "120d", days: 120 },
  { label: "150d", days: 150 },
  { label: "180d", days: 180 },
  { label: "1 ano", days: 360 },
];

/** Highlights matching portions of text */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function PeriodSelector({ filters, onChange }: { readonly filters: IntelligenceFilters; readonly onChange: (filters: IntelligenceFilters) => void }) {
  return <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border/50 overflow-x-auto">{PERIOD_OPTIONS.map(period => <Button key={period.days} variant={filters.days === period.days ? "default" : "ghost"} size="sm" className={cn("h-7 text-xs px-2.5 rounded-lg shrink-0 transition-all", filters.days === period.days && "bg-primary shadow-sm")} onClick={() => onChange({ ...filters, days: period.days })}>{period.label}</Button>)}</div>;
}

interface ProductFilterProps {
  readonly filters: IntelligenceFilters;
  readonly open: boolean;
  readonly search: string;
  readonly products: readonly ProductLightweight[];
  readonly onOpenChange: (open: boolean) => void;
  readonly onSearchChange: (search: string) => void;
  readonly onFiltersChange: (filters: IntelligenceFilters) => void;
}

function productFilterLabel(name: string | null) {
  if (!name) return "Produto";
  return name.length > 20 ? `${name.slice(0, 20)}…` : name;
}

function ProductFilter(props: ProductFilterProps) {
  const clear = () => {
    props.onFiltersChange({ ...props.filters, productId: null, productName: null });
    props.onOpenChange(false);
    props.onSearchChange("");
  };
  const select = (product: ProductLightweight) => {
    props.onFiltersChange({ ...props.filters, productId: product.id, productName: product.name });
    props.onOpenChange(false);
    props.onSearchChange("");
  };
  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange}>
      <PopoverTrigger asChild><Button variant="outline" size="sm" className={cn(FILTER_BUTTON_CLASS, props.filters.productId && ACTIVE_FILTER_CLASS)}><Package className="h-3 w-3" />{productFilterLabel(props.filters.productName)}<ChevronDown className="h-3 w-3 opacity-50" /></Button></PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start"><Command shouldFilter={false}><CommandInput placeholder="Buscar produto por nome ou SKU..." value={props.search} onValueChange={props.onSearchChange} /><CommandList className="max-h-72"><CommandEmpty><div className="flex flex-col items-center py-4 text-muted-foreground"><Search className="h-8 w-8 mb-2 opacity-40" /><p className="text-sm">Nenhum produto encontrado</p><p className="text-xs">Tente outro termo de busca</p></div></CommandEmpty><CommandGroup><CommandItem onSelect={clear}><span className="text-muted-foreground">Todos os produtos</span></CommandItem>{props.products.map(product => <CommandItem key={product.id} value={product.id} onSelect={() => select(product)} className="flex items-center gap-2.5 py-2"><div className="w-8 h-8 rounded-md overflow-hidden bg-muted border border-border/50 shrink-0">{product.image_url && product.image_url !== '/placeholder.svg' ? <img src={product.image_url} alt="Imagem do produto" className="w-full h-full object-contain" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Package className="h-3.5 w-3.5 text-muted-foreground" /></div>}</div><div className={cn("flex flex-col min-w-0 flex-1", props.filters.productId === product.id && SELECTED_PRODUCT_CLASS)}><span className="text-sm truncate"><HighlightText text={product.name} query={props.search} /></span>{product.sku && <span className="text-[10px] text-muted-foreground truncate"><HighlightText text={product.sku} query={props.search} /></span>}</div></CommandItem>)}{props.search && props.products.length >= 50 && <div className="px-3 py-2 text-[10px] text-muted-foreground text-center">Mostrando 50 resultados · refine sua busca</div>}</CommandGroup></CommandList></Command></PopoverContent>
    </Popover>
  );
}

interface ActiveFiltersProps {
  readonly count: number;
  readonly filters: IntelligenceFilters;
  readonly onChange: (filters: IntelligenceFilters) => void;
  readonly onClear: () => void;
}

function ActiveFilters({ count, filters, onChange, onClear }: ActiveFiltersProps) {
  if (count === 0) return null;
  return <><Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={onClear}><X className="h-3 w-3" />Limpar filtros<Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{count}</Badge></Button><div className="basis-full flex flex-wrap gap-1.5">{filters.productName && <Badge variant="outline" className="gap-1 text-xs px-2 py-0.5 bg-primary/5 border-primary/20">Produto: {filters.productName}<X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => onChange({ ...filters, productId: null, productName: null })} /></Badge>}{filters.categoryName && <Badge variant="outline" className="gap-1 text-xs px-2 py-0.5 bg-primary/5 border-primary/20">Categoria: {filters.categoryName}<X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => onChange({ ...filters, categoryId: null, categoryName: null })} /></Badge>}{filters.supplierName && <Badge variant="outline" className="gap-1 text-xs px-2 py-0.5 bg-primary/5 border-primary/20">Fornecedor: {filters.supplierName}<X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => onChange({ ...filters, supplierId: null, supplierName: null })} /></Badge>}</div></>;
}

export function IntelligenceFilterBar({ filters, onFiltersChange }: IntelligenceFilterBarProps) {
  const { data: categories = [] } = useCategories();
  const { suppliers } = useSuppliers();
  const { data: products = [] } = useProductsLightweight();
  const [catOpen, setCatOpen] = useState(false);
  const [supOpen, setSupOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [prodSearch, setProdSearch] = useState("");
  const [catSearch, setCatSearch] = useState("");
  const [supSearch, setSupSearch] = useState("");

  const activeFilterCount =
    (filters.categoryId ? 1 : 0) + (filters.supplierId ? 1 : 0) + (filters.productId ? 1 : 0);

  const clearAll = () => {
    onFiltersChange({ ...filters, categoryId: null, categoryName: null, supplierId: null, supplierName: null, productId: null, productName: null });
  };

  const filteredProducts = useMemo(() => {
    if (!prodSearch.trim()) return products.slice(0, 50);
    const q = prodSearch.toLowerCase().trim();
    return products.filter(p => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))).slice(0, 50);
  }, [products, prodSearch]);

  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories;
    const q = catSearch.toLowerCase().trim();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, catSearch]);

  const filteredSuppliers = useMemo(() => {
    if (!supSearch.trim()) return suppliers;
    const q = supSearch.toLowerCase().trim();
    return suppliers.filter(s => s.name.toLowerCase().includes(q));
  }, [suppliers, supSearch]);

  return (
    <div className="space-y-3">
      {/* Period + Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        <PeriodSelector filters={filters} onChange={onFiltersChange} />

        {/* Category Filter */}
        <Popover open={catOpen} onOpenChange={setCatOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                FILTER_BUTTON_CLASS,
                filters.categoryId && ACTIVE_FILTER_CLASS
              )}
            >
              <Filter className="h-3 w-3" />
              {filters.categoryName || "Categoria"}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Buscar categoria..." value={catSearch} onValueChange={setCatSearch} />
              <CommandList>
                <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onFiltersChange({ ...filters, categoryId: null, categoryName: null });
                      setCatOpen(false);
                      setCatSearch("");
                    }}
                  >
                    <span className="text-muted-foreground">Todas as categorias</span>
                  </CommandItem>
                  {filteredCategories.map((cat) => (
                    <CommandItem
                      key={String(cat.id)}
                      value={String(cat.id)}
                      onSelect={() => {
                        onFiltersChange({ ...filters, categoryId: String(cat.id), categoryName: cat.name });
                        setCatOpen(false);
                        setCatSearch("");
                      }}
                    >
                      <span className={cn(
                        filters.categoryId === String(cat.id) && SELECTED_PRODUCT_CLASS
                      )}>
                        <HighlightText text={cat.name} query={catSearch} />
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Supplier Filter */}
        <Popover open={supOpen} onOpenChange={setSupOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                FILTER_BUTTON_CLASS,
                filters.supplierId && ACTIVE_FILTER_CLASS
              )}
            >
              <Filter className="h-3 w-3" />
              {filters.supplierName || "Fornecedor"}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Buscar fornecedor..." value={supSearch} onValueChange={setSupSearch} />
              <CommandList>
                <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onFiltersChange({ ...filters, supplierId: null, supplierName: null });
                      setSupOpen(false);
                      setSupSearch("");
                    }}
                  >
                    <span className="text-muted-foreground">Todos os fornecedores</span>
                  </CommandItem>
                  {filteredSuppliers.map((sup) => (
                    <CommandItem
                      key={sup.id}
                      value={sup.id}
                      onSelect={() => {
                        onFiltersChange({ ...filters, supplierId: sup.id, supplierName: sup.name });
                        setSupOpen(false);
                        setSupSearch("");
                      }}
                    >
                      <span className={cn(
                        filters.supplierId === sup.id && SELECTED_PRODUCT_CLASS
                      )}>
                        <HighlightText text={sup.name} query={supSearch} />
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <ProductFilter filters={filters} open={prodOpen} search={prodSearch} products={filteredProducts} onOpenChange={setProdOpen} onSearchChange={setProdSearch} onFiltersChange={onFiltersChange} />

        <ActiveFilters count={activeFilterCount} filters={filters} onChange={onFiltersChange} onClear={clearAll} />
      </div>
    </div>
  );
}
