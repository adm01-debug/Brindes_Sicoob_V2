import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FavoritesSort =
  | "recent" | "oldest" | "price-asc" | "price-desc"
  | "name-asc" | "name-desc" | "category";

const LABELS: Record<FavoritesSort, string> = {
  "recent": "Recém-adicionados",
  "oldest": "Mais antigos",
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
  "name-asc": "Nome (A→Z)",
  "name-desc": "Nome (Z→A)",
  "category": "Categoria",
};

interface Props {
  value: FavoritesSort;
  onChange: (s: FavoritesSort) => void;
  /** Filtro: mostrar apenas items com queda de preço */
  onlyPriceDrops?: boolean;
  onTogglePriceDrops?: (v: boolean) => void;
  /** Quantidade de items com queda — exibido como counter no chip. null oculta o chip */
  priceDropCount?: number | null;
}

function shouldShowPriceDropChip(
  onTogglePriceDrops: Props["onTogglePriceDrops"],
  priceDropCount: Props["priceDropCount"],
) {
  if (!onTogglePriceDrops) return false;
  if (typeof priceDropCount !== "number") return true;
  return priceDropCount > 0;
}

function PriceDropCount({ count, selected }: { count: number | null | undefined; selected: boolean }) {
  if (typeof count !== "number" || count <= 0) return null;
  const colorClass = selected
    ? "bg-success-foreground/20 text-success-foreground"
    : "bg-success/20 text-success";

  return (
    <span className={cn("rounded-full px-1.5 text-[10px] font-bold tabular-nums", colorClass)}>
      {count}
    </span>
  );
}

function PriceDropFilter({
  selected,
  onToggle,
  count,
}: {
  selected: boolean;
  onToggle: (value: boolean) => void;
  count: number | null | undefined;
}) {
  return (
    <Button
      variant={selected ? "default" : "outline"}
      size="sm"
      onClick={() => onToggle(!selected)}
      className={cn(
        "h-8 gap-1.5 text-xs transition-all",
        selected && "bg-success text-success-foreground hover:bg-success/90",
      )}
      aria-pressed={selected}
      title={selected ? "Mostrar todos" : "Filtrar items com queda de preço"}
    >
      <TrendingDown className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Quedas</span>
      <PriceDropCount count={count} selected={selected} />
    </Button>
  );
}

function SortMenu({ value, onChange }: Pick<Props, "value" | "onChange">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span className="text-xs hidden sm:inline">{LABELS[value]}</span>
          <span className="text-xs sm:hidden">Ordenar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Ordenação</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(nextValue) => onChange(nextValue as FavoritesSort)}>
          {(Object.keys(LABELS) as FavoritesSort[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key} className="text-xs">
              {LABELS[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FavoritesSortBar({
  value, onChange, onlyPriceDrops = false, onTogglePriceDrops, priceDropCount,
}: Props) {
  const showDropChip = shouldShowPriceDropChip(onTogglePriceDrops, priceDropCount);

  return (
    <div className="flex items-center gap-1.5">
      {showDropChip && onTogglePriceDrops && (
        <PriceDropFilter
          selected={onlyPriceDrops}
          onToggle={onTogglePriceDrops}
          count={priceDropCount}
        />
      )}
      <SortMenu value={value} onChange={onChange} />
    </div>
  );
}
