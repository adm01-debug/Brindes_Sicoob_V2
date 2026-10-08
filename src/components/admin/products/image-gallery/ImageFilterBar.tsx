import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Filter, Palette } from 'lucide-react';
import { type FilterMode, type VariantInfo, type GalleryStats, IMAGE_TYPES } from "./types";

const ACTIVE_FILTER_CLASS = "bg-background shadow-sm text-foreground";
const INACTIVE_FILTER_CLASS = "text-muted-foreground hover:text-foreground";
const SELECTED_CHIP_CLASS = "bg-primary/10 border-primary/30 text-primary";
const VARIANT_FILTER = 'by-variant';

interface Props {
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  stats: GalleryStats;
  activeTypes: Set<string>;
  variantMap: Map<string, VariantInfo>;
  hasVariants: boolean;
}

function ViewModeFilters({ filterMode, setFilterMode, stats, hasVariants }: Pick<Props, "filterMode" | "setFilterMode" | "stats" | "hasVariants">) {
  const buttonClass = "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all";
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/50 border border-border/40">
      <button type="button" onClick={() => setFilterMode('all')} className={cn(buttonClass, filterMode === 'all' ? ACTIVE_FILTER_CLASS : INACTIVE_FILTER_CLASS)}>Todas</button>
      <button type="button" onClick={() => setFilterMode('general')} className={cn(buttonClass, filterMode === 'general' ? ACTIVE_FILTER_CLASS : INACTIVE_FILTER_CLASS)}>Gerais ({stats.withoutVariant})</button>
      {hasVariants && <button type="button" onClick={() => setFilterMode(VARIANT_FILTER)} className={cn(buttonClass, "flex items-center gap-1", filterMode === VARIANT_FILTER ? ACTIVE_FILTER_CLASS : INACTIVE_FILTER_CLASS)}><Palette className="h-3 w-3" /> Por Cor ({stats.byVariant.size})</button>}
    </div>
  );
}

function TypeFilters({ typeFilter, setTypeFilter, stats, activeTypes }: Pick<Props, "typeFilter" | "setTypeFilter" | "stats" | "activeTypes">) {
  const inactiveClass = "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50";
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Filter className="h-3 w-3 text-muted-foreground/60 mr-0.5" />
      <button type="button" onClick={() => setTypeFilter('all')} className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border", typeFilter === 'all' ? SELECTED_CHIP_CLASS : inactiveClass)}>Todos tipos</button>
      {IMAGE_TYPES.filter((type) => activeTypes.has(type.value)).map((type) => <button key={type.value} type="button" onClick={() => setTypeFilter(typeFilter === type.value ? 'all' : type.value)} className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border flex items-center gap-1", typeFilter === type.value ? SELECTED_CHIP_CLASS : inactiveClass)}><type.icon className={cn("h-2.5 w-2.5", type.color)} /> {type.label} ({stats.byType.get(type.value) || 0})</button>)}
    </div>
  );
}

function VariantFilters({ filterMode, setFilterMode, stats, variantMap }: Pick<Props, "filterMode" | "setFilterMode" | "stats" | "variantMap">) {
  return <div className="flex flex-wrap gap-1.5 pl-1">{Array.from(stats.byVariant.entries()).map(([code, count]) => {
    const variant = variantMap.get(code);
    return <button key={code} type="button" onClick={() => setFilterMode(filterMode === code ? VARIANT_FILTER : code)} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all", filterMode === code ? SELECTED_CHIP_CLASS : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30")}>{variant?.color_hex ? <div className="w-3 h-3 rounded-full border border-border/60" style={{ backgroundColor: variant.color_hex }} /> : <Palette className="h-3 w-3" />}<span>{variant?.color_name || variant?.name || code}</span><Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">{count}</Badge></button>;
  })}</div>;
}

export function ImageFilterBar({ filterMode, setFilterMode, typeFilter, setTypeFilter, stats, activeTypes, variantMap, hasVariants }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <ViewModeFilters filterMode={filterMode} setFilterMode={setFilterMode} stats={stats} hasVariants={hasVariants} />

        <div className="h-5 w-px bg-border/50" />

        <TypeFilters typeFilter={typeFilter} setTypeFilter={setTypeFilter} stats={stats} activeTypes={activeTypes} />
      </div>

      {filterMode === VARIANT_FILTER && hasVariants && <VariantFilters filterMode={filterMode} setFilterMode={setFilterMode} stats={stats} variantMap={variantMap} />}
    </div>
  );
}
