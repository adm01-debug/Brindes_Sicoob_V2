/**
 * Box Selector
 * Seletor de caixa/embalagem para o kit com filtros avançados
 */

import { useState, useMemo } from 'react';
import { Search, Package, Check, Ruler, Box, SlidersHorizontal, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BoxCardSkeleton } from './KitCardSkeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatVolume, formatDimensions, formatCurrency, type KitBox, type BoxFilters } from '@/lib/kit-builder';

interface BoxSelectorProps {
  boxes: KitBox[];
  selectedBox: KitBox | null;
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  filters: BoxFilters;
  onFiltersChange: (filters: BoxFilters) => void;
  onSelect: (box: KitBox) => void;
  onClear: () => void;
}

function boxMaterials(boxes: readonly KitBox[]) {
  const materials = new Set<string>();
  boxes.forEach(box => {
    if (box.material) materials.add(box.material);
  });
  return Array.from(materials).sort();
}

function maximumDimensions(boxes: readonly KitBox[]) {
  const maximum = boxes.reduce((result, box) => ({
    width: Math.max(result.width, box.internalWidth),
    height: Math.max(result.height, box.internalHeight),
    depth: Math.max(result.depth, box.internalDepth),
  }), { width: 0, height: 0, depth: 0 });
  return {
    width: Math.ceil(maximum.width) || 50,
    height: Math.ceil(maximum.height) || 50,
    depth: Math.ceil(maximum.depth) || 50,
  };
}

function hasAdvancedFilters(filters: BoxFilters) {
  return [filters.minWidth, filters.minHeight, filters.minDepth, filters.material].some(Boolean);
}

function SelectedBoxSummary({ box, onClear }: { readonly box: KitBox; readonly onClear: () => void }) {
  return (
    <Card className="border-primary bg-primary/5"><CardContent className="p-6"><div className="flex items-start gap-4">
      <div className="w-24 h-24 rounded-lg bg-secondary overflow-hidden flex-shrink-0">{box.imageUrl ? <img src={box.imageUrl} alt={box.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Package className="h-10 w-10 text-muted-foreground" /></div>}</div>
      <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><Badge variant="default" className="bg-primary"><Check className="h-3 w-3 mr-1" />Selecionada</Badge></div><h3 className="font-display font-semibold text-lg truncate">{box.name}</h3><p className="text-sm text-muted-foreground font-mono">{box.sku}</p><div className="flex flex-wrap gap-3 mt-3"><div className="flex items-center gap-1.5 text-sm"><Ruler className="h-4 w-4 text-muted-foreground" /><span>{formatDimensions(box.internalWidth, box.internalHeight, box.internalDepth)}</span></div><div className="flex items-center gap-1.5 text-sm"><Box className="h-4 w-4 text-muted-foreground" /><span>{formatVolume(box.internalVolume)}</span></div><div className="font-semibold text-primary">{formatCurrency(box.price)}</div></div></div>
      <Button variant="outline" size="sm" onClick={onClear}>Trocar</Button>
    </div></CardContent></Card>
  );
}

interface AdvancedFiltersProps {
  readonly open: boolean;
  readonly filters: BoxFilters;
  readonly materials: readonly string[];
  readonly maximums: { width: number; height: number; depth: number };
  readonly active: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onChange: (filters: BoxFilters) => void;
  readonly onClear: () => void;
}

function DimensionSlider({ label, value, maximum, onChange }: { readonly label: string; readonly value: number | undefined; readonly maximum: number; readonly onChange: (value: number | undefined) => void }) {
  return <div className="space-y-2"><Label className="text-xs text-muted-foreground">{label}: <span className="font-semibold text-foreground">{value || 0}cm</span></Label><Slider min={0} max={maximum} step={1} value={[value || 0]} onValueChange={([next]) => onChange(next || undefined)} /></div>;
}

function AdvancedFilters(props: AdvancedFiltersProps) {
  return (
    <Collapsible open={props.open} onOpenChange={props.onOpenChange}><CollapsibleContent><Card className="border-dashed"><CardContent className="p-4 space-y-4">
      <div className="flex items-center justify-between"><h4 className="text-sm font-semibold flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Filtros Avançados</h4>{props.active && <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={props.onClear}><X className="h-3 w-3" />Limpar</Button>}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DimensionSlider label="Largura mín" value={props.filters.minWidth} maximum={props.maximums.width} onChange={value => props.onChange({ ...props.filters, minWidth: value })} />
        <DimensionSlider label="Altura mín" value={props.filters.minHeight} maximum={props.maximums.height} onChange={value => props.onChange({ ...props.filters, minHeight: value })} />
        <DimensionSlider label="Profundidade mín" value={props.filters.minDepth} maximum={props.maximums.depth} onChange={value => props.onChange({ ...props.filters, minDepth: value })} />
      </div>
      {props.materials.length > 0 && <div className="space-y-2"><Label className="text-xs text-muted-foreground">Material</Label><Select value={props.filters.material || '_all'} onValueChange={value => props.onChange({ ...props.filters, material: value === '_all' ? undefined : value })}><SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Todos os materiais" /></SelectTrigger><SelectContent><SelectItem value="_all">Todos os materiais</SelectItem>{props.materials.map(material => <SelectItem key={material} value={material}>{material}</SelectItem>)}</SelectContent></Select></div>}
    </CardContent></Card></CollapsibleContent></Collapsible>
  );
}

function BoxOption({ box, onSelect }: { readonly box: KitBox; readonly onSelect: (box: KitBox) => void }) {
  return <Card className={cn("group cursor-pointer rounded-xl border-border/50 transition-all duration-200 will-change-transform", "hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40", "focus-within:ring-2 focus-within:ring-primary/60")} onClick={() => onSelect(box)}><CardContent className="p-4"><div className="flex gap-3"><div className="w-20 h-20 rounded-lg bg-secondary overflow-hidden flex-shrink-0">{box.imageUrl ? <img src={box.imageUrl} alt={box.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground" /></div>}</div><div className="flex-1 min-w-0"><h4 className="font-medium truncate group-hover:text-primary transition-colors">{box.name}</h4><p className="text-xs text-muted-foreground font-mono mb-2">{box.sku}</p><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{formatDimensions(box.internalWidth, box.internalHeight, box.internalDepth)}</span><span>•</span><span>{formatVolume(box.internalVolume)}</span>{box.material && <><span>•</span><span>{box.material}</span></>}</div><p className="font-semibold text-primary mt-1">{formatCurrency(box.price)}</p></div></div></CardContent></Card>;
}

interface BoxListProps {
  readonly boxes: readonly KitBox[];
  readonly isLoading: boolean;
  readonly error: Error | null | undefined;
  readonly hasActiveFilters: boolean;
  readonly onRetry?: () => void;
  readonly onClearFilters: () => void;
  readonly onSelect: (box: KitBox) => void;
}

function BoxList(props: BoxListProps) {
  if (props.error) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center"><AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" /><p className="font-medium">Não foi possível consultar as embalagens</p><p className="mt-1 text-sm text-muted-foreground">Nenhum produto ilustrativo foi usado. Tente consultar o catálogo novamente.</p>{props.onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={props.onRetry}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button>}</div>;
  if (props.isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2, 3, 4].map(index => <BoxCardSkeleton key={index} />)}</div>;
  if (props.boxes.length === 0) return <div className="text-center py-12"><Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">Nenhuma caixa encontrada</p><p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>{props.hasActiveFilters && <Button variant="link" size="sm" className="mt-2" onClick={props.onClearFilters}>Limpar filtros</Button>}</div>;
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{props.boxes.map(box => <BoxOption key={box.id} box={box} onSelect={props.onSelect} />)}</div>;
}

export function BoxSelector({
  boxes,
  selectedBox,
  isLoading,
  error,
  onRetry,
  filters,
  onFiltersChange,
  onSelect,
  onClear,
}: BoxSelectorProps) {
  const [searchValue, setSearchValue] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const materials = useMemo(() => boxMaterials(boxes), [boxes]);
  const maxDims = useMemo(() => maximumDimensions(boxes), [boxes]);
  const hasActiveFilters = hasAdvancedFilters(filters);

  const activeFilterCount = [filters.minWidth, filters.minHeight, filters.minDepth, filters.material].filter(Boolean).length;

  const clearAdvancedFilters = () => {
    onFiltersChange({
      ...filters,
      minWidth: undefined,
      minHeight: undefined,
      minDepth: undefined,
      material: undefined,
    });
  };

  // Se já tem uma caixa selecionada, mostra resumo
  if (selectedBox) {
    return <SelectedBoxSummary box={selectedBox} onClear={onClear} />;
  }

  return (
    <div className="space-y-4">
      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar caixa ou embalagem..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={hasActiveFilters ? 'default' : 'outline'}
          size="icon" aria-label="SlidersHorizontal"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="relative flex-shrink-0"
          title="Filtros avançados"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <AdvancedFilters open={filtersOpen} filters={filters} materials={materials} maximums={maxDims} active={hasActiveFilters} onOpenChange={setFiltersOpen} onChange={onFiltersChange} onClear={clearAdvancedFilters} />

      {/* Box list */}
      <ScrollArea className="h-[50vh] pr-4">
        <BoxList boxes={boxes} isLoading={isLoading} error={error} hasActiveFilters={hasActiveFilters} onRetry={onRetry} onClearFilters={clearAdvancedFilters} onSelect={onSelect} />
      </ScrollArea>
    </div>
  );
}
