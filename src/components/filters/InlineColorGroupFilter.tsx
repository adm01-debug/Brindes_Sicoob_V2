import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useColorSystem, isLightColor, type ColorFilters } from '@/hooks/useColorSystem';
import type { ColorFilterSelection } from './ColorGroupFilter';

// =====================================================
// SWATCH COM RADIX TOOLTIP
// =====================================================

interface InlineColorSwatchProps {
  hexCode: string | null;
  isSelected: boolean;
  onClick: () => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  hasVariations?: boolean;
  isExpanded?: boolean;
  onExpandToggle?: () => void;
}

const INLINE_SWATCH_SIZES = { sm: 'w-6 h-6', md: 'w-8 h-8', lg: 'w-10 h-10' };

function getInlineSwatchStyle(hexCode: string | null, selected: boolean) {
  const fallback = hexCode || '#ccc';
  const transparent = !hexCode;
  return {
    background: transparent ? 'conic-gradient(from 0deg, #FF0000, #FF8000, #FFFF00, #00FF00, #0000FF, #8000FF, #FF0000)' : undefined,
    backgroundColor: transparent ? undefined : fallback,
    ...(selected ? { borderColor: fallback, ['--tw-ring-color' as string]: fallback } : {}),
  };
}

function VariationToggle({ label, expanded, onToggle }: { label: string; expanded?: boolean; onToggle?: () => void }) {
  return <button type="button" onClick={(event) => { event.stopPropagation(); onToggle?.(); }} className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center bg-background border border-border shadow-sm hover:bg-muted transition-colors", expanded && "bg-primary/10 border-primary/40")} aria-label={`Expandir variações de ${label}`}>{expanded ? <ChevronUp className="w-2.5 h-2.5 text-muted-foreground" /> : <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />}</button>;
}

function InlineColorSwatch({
  hexCode,
  isSelected,
  onClick,
  label,
  size = 'md',
  hasVariations,
  isExpanded,
  onExpandToggle,
}: InlineColorSwatchProps) {
  const isTransparent = !hexCode;
  const isLight = isLightColor(hexCode);
  const selectionClass = isSelected ? 'ring-2 ring-offset-1' : 'border-border hover:border-muted-foreground/50';

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            aria-label={`Filtrar por cor ${label}`}
            className={cn(
              INLINE_SWATCH_SIZES[size],
              'rounded-full border-2 transition-all duration-200 flex items-center justify-center',
              'hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2',
              selectionClass,
              isTransparent && ''
            )}
            style={getInlineSwatchStyle(hexCode, isSelected)}
          >
            {isSelected && (
              <Check
                className="w-4 h-4"
                style={{ color: isLight ? '#000000' : '#FFFFFF' }}
                strokeWidth={3}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}{hasVariations ? ' (clique ▾ para variações)' : ''}
        </TooltipContent>
      </Tooltip>
      {hasVariations && <VariationToggle label={label} expanded={isExpanded} onToggle={onExpandToggle} />}
    </div>
  );
}

// =====================================================
// COMPONENTE INLINE
// =====================================================

interface InlineColorGroupFilterProps {
  selection: ColorFilterSelection;
  onChange: (selection: ColorFilterSelection) => void;
  showNuances?: boolean;
  showVariations?: boolean;
  swatchSize?: 'sm' | 'md' | 'lg';
}

function toggleSelection(values: string[], slug: string): string[] {
  return values.includes(slug) ? values.filter(value => value !== slug) : [...values, slug];
}

function useInlineColorController(selection: ColorFilterSelection, onChange: (selection: ColorFilterSelection) => void) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const totalSelected = selection.groups.length + selection.variations.length + selection.nuances.length;
  const toggleGroup = (slug: string) => onChange({ ...selection, groups: toggleSelection(selection.groups, slug) });
  const toggleVariation = (slug: string) => onChange({ ...selection, variations: toggleSelection(selection.variations, slug) });
  const toggleNuance = (slug: string) => onChange({ ...selection, nuances: toggleSelection(selection.nuances, slug) });
  const toggleExpand = (groupId: string) => setExpandedGroups(previous => { const next = new Set(previous); if (next.has(groupId)) next.delete(groupId); else next.add(groupId); return next; });
  const clear = () => onChange({ groups: [], variations: [], nuances: [] });
  return { expandedGroups, totalSelected, toggleGroup, toggleVariation, toggleNuance, toggleExpand, clear };
}

type InlineController = ReturnType<typeof useInlineColorController>;

function InlineGroupSwatches({ colorData, selection, controller, swatchSize, showVariations }: { colorData: ColorFilters; selection: ColorFilterSelection; controller: InlineController; swatchSize: 'sm' | 'md' | 'lg'; showVariations: boolean }) {
  const variableGroups = new Set(colorData.groups.filter(group => group.variations.length > 1).map(group => group.id));
  const sizeClass = swatchSize === 'sm' ? 'gap-1.5 max-h-[6rem]' : 'gap-2.5 max-h-[8.4rem]';
  return <div className={cn("flex flex-wrap gap-2 overflow-y-auto overscroll-contain pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent", sizeClass)} style={{ scrollbarWidth: 'thin', scrollbarGutter: 'stable' }}>{colorData.groups.map(group => <InlineColorSwatch key={group.id} hexCode={group.hex_code} isSelected={selection.groups.includes(group.slug)} onClick={() => controller.toggleGroup(group.slug)} label={group.name} size={swatchSize} hasVariations={showVariations && variableGroups.has(group.id)} isExpanded={controller.expandedGroups.has(group.id)} onExpandToggle={() => controller.toggleExpand(group.id)} />)}</div>;
}

function InlineSelectionSummary({ total, onClear }: { total: number; onClear: () => void }) {
  if (total === 0) return null;
  return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Badge variant="secondary" className="text-xs">{total} selecionado{total > 1 ? 's' : ''}</Badge><button type="button" onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive transition-colors" aria-label="Limpar filtros de cor">Limpar</button></div>;
}

function InlineVariations({ colorData, selection, controller }: { colorData: ColorFilters; selection: ColorFilterSelection; controller: InlineController }) {
  const groups = colorData.groups.filter(group => controller.expandedGroups.has(group.id) && group.variations.length > 1);
  return <>{groups.map(group => <div key={group.id} className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-2"><div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded-full border" style={{ backgroundColor: group.hex_code || '#ccc' }} /><span className="font-medium text-xs">{group.name}</span><Badge variant="outline" className="text-[10px] h-4 ml-auto">{group.variations.length} variações</Badge></div><div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto overscroll-contain" style={{ overscrollBehavior: 'contain' }}>{group.variations.map(variation => { const selected = selection.variations.includes(variation.slug); return <button key={variation.id} onClick={() => controller.toggleVariation(variation.slug)} aria-label={`Filtrar por ${variation.name}`} className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all border hover:bg-accent', selected ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border')}><div className="w-3 h-3 rounded-full border flex-shrink-0" style={{ backgroundColor: variation.hex_code || group.hex_code || '#ccc' }} />{variation.name}{selected && <Check className="w-3 h-3 flex-shrink-0" />}</button>; })}</div></div>)}</>;
}

function InlineNuances({ colorData, selection, onToggle }: { colorData: ColorFilters; selection: ColorFilterSelection; onToggle: (slug: string) => void }) {
  return <div><h5 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Sparkles className="w-3 h-3" />Acabamento</h5><div className="flex flex-wrap gap-1.5">{colorData.nuances.map(nuance => { const selected = selection.nuances.includes(nuance.slug); return <button key={nuance.id} onClick={() => onToggle(nuance.slug)} aria-label={`Filtrar por acabamento ${nuance.name}`} className={cn('px-3 py-1.5 rounded-full text-xs transition-all border hover:bg-accent', selected ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border')}>{nuance.name}{selected && <Check className="w-3 h-3 ml-1 inline" />}</button>; })}</div></div>;
}

export function InlineColorGroupFilter({ selection, onChange, showNuances = true, showVariations = true, swatchSize = 'md' }: InlineColorGroupFilterProps) {
  const { data: colorData, isLoading } = useColorSystem();
  const controller = useInlineColorController(selection, onChange);
  if (isLoading) return <div className="flex gap-1.5 flex-wrap">{Array.from({ length: 10 }).map((_, index) => <Skeleton key={index} className="w-8 h-8 rounded-full" />)}</div>;
  if (!colorData) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        <InlineGroupSwatches colorData={colorData} selection={selection} controller={controller} swatchSize={swatchSize} showVariations={showVariations} />
        <InlineSelectionSummary total={controller.totalSelected} onClear={controller.clear} />
        {showVariations && <InlineVariations colorData={colorData} selection={selection} controller={controller} />}
        {showNuances && colorData.nuances.length > 0 && <InlineNuances colorData={colorData} selection={selection} onToggle={controller.toggleNuance} />}
      </div>
    </TooltipProvider>
  );
}

export default InlineColorGroupFilter;
