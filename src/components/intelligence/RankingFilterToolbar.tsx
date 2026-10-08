import { useState, useMemo } from "react";
import { Search, Filter, ChevronDown, X, Tag, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

function HighlightMatch({ text, query }: { text: string; query: string }) {
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

export { HighlightMatch };

const PERIOD_OPTIONS = [
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "1 ano", days: 360 },
];

const LIMIT_OPTIONS = [10, 20, 30, 50];

interface Supplier { id: string; name: string }
interface Category { id: string | number; name: string }

export interface RankingFilters {
  searchTerm: string;
  debouncedSearch: string;
  days: number;
  limit: number;
  supplierId: string | null;
  supplierName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  hasActiveFilters: boolean;
}

interface RankingFilterToolbarProps {
  filters: RankingFilters;
  suppliers: Supplier[];
  categories: Category[];
  onSearchChange: (value: string) => void;
  onDaysChange: (days: number) => void;
  onLimitChange: (limit: number) => void;
  onSupplierChange: (id: string | null, name: string | null) => void;
  onCategoryChange: (id: string | null, name: string | null) => void;
  onClearAll: () => void;
}

export function RankingFilterToolbar({
  filters,
  suppliers,
  categories,
  onSearchChange,
  onDaysChange,
  onLimitChange,
  onSupplierChange,
  onCategoryChange,
  onClearAll,
}: RankingFilterToolbarProps) {
  const [supOpen, setSupOpen] = useState(false);
  const [supSearch, setSupSearch] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  const filteredSuppliers = useMemo(() => {
    if (!supSearch.trim()) return suppliers;
    const q = supSearch.toLowerCase().trim();
    return suppliers.filter(s => s.name.toLowerCase().includes(q));
  }, [suppliers, supSearch]);

  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories;
    const q = catSearch.toLowerCase().trim();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, catSearch]);

  return (
    <div className="flex flex-col gap-2">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder='Ex: "squeeze metal", "caneta", "mochila"...'
          value={filters.searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
        {filters.searchTerm && (
          <button aria-label="Fechar"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period */}
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 border border-border/50">
          {PERIOD_OPTIONS.map((p) => (
            <Button
              key={p.days}
              variant={filters.days === p.days ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-6 text-[10px] px-2 rounded-md",
                filters.days === p.days && "bg-primary shadow-sm"
              )}
              onClick={() => onDaysChange(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Category filter */}
        <Popover open={catOpen} onOpenChange={setCatOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-7 gap-1 text-[11px]",
                filters.categoryId && "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              <Tag className="h-3 w-3" />
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
                  <CommandItem onSelect={() => { onCategoryChange(null, null); setCatOpen(false); setCatSearch(""); }}>
                    <span className="text-muted-foreground">Todas as categorias</span>
                  </CommandItem>
                  {filteredCategories.map((cat) => (
                    <CommandItem
                      key={String(cat.id)}
                      value={String(cat.id)}
                      onSelect={() => { onCategoryChange(String(cat.id), cat.name); setCatOpen(false); setCatSearch(""); }}
                    >
                      <span className={cn(filters.categoryId === String(cat.id) && "font-semibold text-primary")}>
                        {catSearch ? <HighlightMatch text={cat.name} query={catSearch} /> : cat.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Supplier filter */}
        <Popover open={supOpen} onOpenChange={setSupOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-7 gap-1 text-[11px]",
                filters.supplierId && "border-primary/50 bg-primary/5 text-primary"
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
                  <CommandItem onSelect={() => { onSupplierChange(null, null); setSupOpen(false); setSupSearch(""); }}>
                    <span className="text-muted-foreground">Todos os fornecedores</span>
                  </CommandItem>
                  {filteredSuppliers.map((sup) => (
                    <CommandItem
                      key={sup.id}
                      value={sup.id}
                      onSelect={() => { onSupplierChange(sup.id, sup.name); setSupOpen(false); setSupSearch(""); }}
                    >
                      <span className={cn(filters.supplierId === sup.id && "font-semibold text-primary")}>
                        {supSearch ? <HighlightMatch text={sup.name} query={supSearch} /> : sup.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Limit selector */}
        <div className="flex items-center gap-1">
          <Hash className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Top</span>
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5 border border-border/50">
            {LIMIT_OPTIONS.map((n) => (
              <Button
                key={n}
                variant={filters.limit === n ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-5 text-[10px] px-1.5 rounded",
                  filters.limit === n && "bg-primary shadow-sm"
                )}
                onClick={() => onLimitChange(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>

        {/* Clear filters */}
        {filters.hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-muted-foreground gap-1"
            onClick={onClearAll}
          >
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
