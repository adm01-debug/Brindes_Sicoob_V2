/**
 * SizeFilter — Filtro de tamanho no Super Filtro
 * Extrai size_codes únicos das variações dos produtos carregados.
 */
import { useMemo, useState } from "react";
import { AlertCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";


const SIZE_ORDER = [
  "PP", "P", "M", "G", "GG", "XG", "XXG", "EG", "EGG",
  "XS", "S", "L", "XL", "XXL", "2XL", "3XL",
  "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46",
  "100ml", "200ml", "300ml", "350ml", "400ml", "500ml", "600ml", "750ml", "1L",
];

function getSizeOrder(code: string): number {
  const upper = code.toUpperCase().trim();
  const idx = SIZE_ORDER.indexOf(upper);
  if (idx >= 0) return idx;
  const num = parseFloat(upper);
  if (!isNaN(num)) return 1000 + num;
  return 2000;
}

interface SizeFilterProps {
  selectedSizes: string[];
  onToggleSize: (size: string) => void;
  /** Products with variations containing size_code */
  products?: Array<{ variations?: Array<{ size_code?: string | null }> }>;
  availableSizes?: string[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

function RetryButton({ onRetry }: { onRetry?: () => void }) {
  if (!onRetry) return null;
  return <button type="button" className="font-medium underline" onClick={onRetry}>Tentar novamente</button>;
}

function EmptySizesState({ isLoading, error, onRetry }: Pick<SizeFilterProps, "isLoading" | "error" | "onRetry">) {
  if (!error) return <p className="text-xs text-muted-foreground px-1">{isLoading ? "Carregando tamanhos disponíveis..." : "Nenhum tamanho disponível no catálogo."}</p>;
  return (
    <div role="alert" className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
      <p className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />Não foi possível carregar os tamanhos disponíveis.</p>
      <RetryButton onRetry={onRetry} />
    </div>
  );
}

function CachedSizesWarning({ onRetry }: Pick<SizeFilterProps, "onRetry">) {
  return (
    <div role="alert" className="flex items-center justify-between gap-2 rounded-md border border-warning/30 bg-warning/5 p-2 text-xs text-foreground">
      <span>Exibindo tamanhos em cache; a atualização falhou.</span><RetryButton onRetry={onRetry} />
    </div>
  );
}

function SizeOptions({ sizes, selectedSizes, onToggleSize }: { sizes: string[]; selectedSizes: string[]; onToggleSize: (size: string) => void }) {
  return <div className="flex flex-wrap gap-1.5">{sizes.map((size) => (
    <button key={size} type="button" onClick={() => onToggleSize(size)} className={cn(
      "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
      selectedSizes.includes(size) ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card border-border text-foreground hover:border-primary/40 hover:bg-accent"
    )}>{size}</button>
  ))}</div>;
}

export function SizeFilter({ selectedSizes, onToggleSize, products = [], availableSizes: externalSizes = [], isLoading = false, error = null, onRetry }: SizeFilterProps) {
  const [search, setSearch] = useState("");

  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    products.forEach((p) => {
      p.variations?.forEach((v) => {
        if (v.size_code) sizeSet.add(v.size_code);
      });
    });
    externalSizes.forEach((size) => sizeSet.add(size));
    return Array.from(sizeSet).sort((a, b) => getSizeOrder(a) - getSizeOrder(b));
  }, [externalSizes, products]);

  const filteredSizes = useMemo(() => {
    if (!search) return availableSizes;
    const q = search.toLowerCase();
    return availableSizes.filter((s) => s.toLowerCase().includes(q));
  }, [availableSizes, search]);

  if (availableSizes.length === 0) {
    return <EmptySizesState isLoading={isLoading} error={error} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-2 px-1">
      {error && <CachedSizesWarning onRetry={onRetry} />}
      {availableSizes.length > 10 && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tamanho..."
            className="h-7 pl-7 pr-7 text-xs"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
      <SizeOptions sizes={filteredSizes} selectedSizes={selectedSizes} onToggleSize={onToggleSize} />
      {selectedSizes.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {selectedSizes.length} tamanho(s) selecionado(s)
        </p>
      )}
    </div>
  );
}
