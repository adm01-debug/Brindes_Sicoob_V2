import { useState, useMemo } from 'react';
import { Check, ChevronDown, ChevronRight, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useColorSystem, type ColorFilters, isLightColor } from '@/hooks/useColorSystem';

// =====================================================
// TIPOS
// =====================================================

export interface ColorFilterSelection {
  groups: string[];      // slugs dos grupos selecionados
  variations: string[];  // slugs das variações selecionadas
  nuances: string[];     // slugs das nuances selecionadas
}

interface ColorGroupFilterProps {
  selection: ColorFilterSelection;
  onChange: (selection: ColorFilterSelection) => void;
  showNuances?: boolean;
  showVariations?: boolean;
  className?: string;
}

// =====================================================
// COMPONENTE DE SWATCH (bolinha de cor)
// =====================================================

interface ColorSwatchProps {
  hexCode: string | null;
  isSelected: boolean;
  onClick: () => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  showCheckmark?: boolean;
}

function ColorSwatchMarker({ selected, checkmark, transparent, light }: { selected: boolean; checkmark: boolean; transparent: boolean; light: boolean }) {
  if (selected && checkmark) return <Check className={cn('w-4 h-4', light ? 'text-foreground' : 'text-primary-foreground')} />;
  if (transparent && !selected) return <div className="w-full h-full rounded-full border border-dashed border-border" />;
  return null;
}

function ColorSwatch({ 
  hexCode, 
  isSelected, 
  onClick, 
  label, 
  size = 'md',
  showCheckmark = true 
}: ColorSwatchProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const isTransparent = !hexCode || hexCode.toLowerCase() === '#ffffff';
  const isLight = isLightColor(hexCode);
  const selectionClass = isSelected ? 'border-primary ring-2 ring-primary ring-offset-1' : 'border-border hover:border-muted-foreground/50';
  const backgroundColor = isTransparent ? undefined : hexCode ?? '#ccc';

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        sizeClasses[size],
        'rounded-full border-2 transition-all duration-200 flex items-center justify-center',
        'hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        selectionClass,
        isTransparent && 'bg-gradient-to-br from-gray-100 to-gray-200'
      )}
      style={{ backgroundColor }}
     aria-label="Confirmar">
      <ColorSwatchMarker selected={isSelected} checkmark={showCheckmark} transparent={isTransparent} light={isLight} />
    </button>
  );
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
}

function collectSelectedNames(colorData: ColorFilters | undefined, selection: ColorFilterSelection): string[] {
  if (!colorData) return [];
  const names: string[] = [];
  colorData.groups.forEach(group => {
    if (selection.groups.includes(group.slug)) names.push(group.name);
    group.variations.forEach(variation => { if (selection.variations.includes(variation.slug)) names.push(variation.name); });
  });
  colorData.nuances.forEach(nuance => { if (selection.nuances.includes(nuance.slug)) names.push(nuance.name); });
  return names;
}

function useColorFilterController(selection: ColorFilterSelection, onChange: (selection: ColorFilterSelection) => void, colorData?: ColorFilters) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const totalSelected = selection.groups.length + selection.variations.length + selection.nuances.length;
  const selectedNames = useMemo(() => collectSelectedNames(colorData, selection), [colorData, selection]);
  const toggleGroup = (slug: string, groupId: string) => {
    const selected = selection.groups.includes(slug);
    if (!selected) setExpandedGroups(previous => new Set(previous).add(groupId));
    onChange({ ...selection, groups: toggleValue(selection.groups, slug) });
  };
  const toggleVariation = (slug: string) => onChange({ ...selection, variations: toggleValue(selection.variations, slug) });
  const toggleNuance = (slug: string) => onChange({ ...selection, nuances: toggleValue(selection.nuances, slug) });
  const toggleExpand = (groupId: string) => setExpandedGroups(previous => { const next = new Set(previous); if (next.has(groupId)) next.delete(groupId); else next.add(groupId); return next; });
  const clearAll = () => { onChange({ groups: [], variations: [], nuances: [] }); setIsOpen(false); };
  return { isOpen, setIsOpen, expandedGroups, totalSelected, selectedNames, toggleGroup, toggleVariation, toggleNuance, toggleExpand, clearAll };
}

type ColorController = ReturnType<typeof useColorFilterController>;

function ColorPreview({ names, data }: { names: string[]; data: ColorFilters }) {
  const visible = names.slice(0, 3).map(name => {
    const group = data.groups.find(item => item.name === name);
    const variation = data.groups.flatMap(item => item.variations).find(item => item.name === name);
    return { name, hex: variation?.hex_code || group?.hex_code || '#ccc' };
  });
  return <div className="flex -space-x-1">{visible.map(item => <div key={item.name} className="w-5 h-5 rounded-full border-2 border-background" style={{ backgroundColor: item.hex }} title={item.name} />)}{names.length > 3 && <div className="w-5 h-5 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium">+{names.length - 3}</div>}</div>;
}

function ColorFilterTrigger({ controller, colorData, className }: { controller: ColorController; colorData: ColorFilters; className?: string }) {
  return <PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={controller.isOpen} className={cn('w-full justify-between h-auto min-h-10 py-2', controller.totalSelected > 0 && 'border-primary', className)}><div className="flex items-center gap-2 flex-wrap"><div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-gradient-to-r from-destructive via-success to-info" /><span className="text-sm font-medium">Cores</span></div>{controller.totalSelected > 0 && <><Badge variant="secondary" className="text-xs">{controller.totalSelected} selecionado{controller.totalSelected > 1 ? 's' : ''}</Badge><ColorPreview names={controller.selectedNames} data={colorData} /></>}</div><ChevronDown className={cn('ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform', controller.isOpen && 'rotate-180')} /></Button></PopoverTrigger>;
}

function ColorGroupsSection({ colorData, selection, onToggle }: { colorData: ColorFilters; selection: ColorFilterSelection; onToggle: (slug: string, id: string) => void }) {
  return <div><h5 className="text-xs font-medium text-muted-foreground mb-2">Grupos de Cor</h5><div className="flex flex-wrap gap-2">{colorData.groups.map(group => <div key={group.id} className="relative group/swatch"><ColorSwatch hexCode={group.hex_code} isSelected={selection.groups.includes(group.slug)} onClick={() => onToggle(group.slug, group.id)} label={group.name} size="md" /><div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover border rounded shadow-sm text-xs whitespace-nowrap opacity-0 group-hover/swatch:opacity-100 transition-opacity pointer-events-none z-10">{group.name}</div></div>)}</div></div>;
}

function ColorVariationsSection({ colorData, selection, expanded, onExpand, onToggle }: { colorData: ColorFilters; selection: ColorFilterSelection; expanded: Set<string>; onExpand: (id: string) => void; onToggle: (slug: string) => void }) {
  const groups = colorData.groups.filter(group => expanded.has(group.id) && group.variations.length > 1);
  return <div className="space-y-2">{groups.map(group => <Collapsible key={group.id} open={expanded.has(group.id)} onOpenChange={() => onExpand(group.id)}><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2"><div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border" style={{ backgroundColor: group.hex_code || '#ccc' }} /><span className="text-sm">{group.name}</span><Badge variant="outline" className="text-[10px] h-4">{group.variations.length} tons</Badge></div><ChevronRight className={cn('h-4 w-4 transition-transform', expanded.has(group.id) && 'rotate-90')} /></Button></CollapsibleTrigger><CollapsibleContent className="pl-6 pt-2"><div className="flex flex-wrap gap-1.5">{group.variations.map(variation => { const selected = selection.variations.includes(variation.slug); return <button key={variation.id} onClick={() => onToggle(variation.slug)} className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all border hover:bg-accent', selected ? 'border-primary bg-primary/10 text-primary' : 'border-border')}><div className="w-3 h-3 rounded-full border" style={{ backgroundColor: variation.hex_code || group.hex_code || '#ccc' }} />{variation.name}{selected && <Check className="w-3 h-3" />}</button>; })}</div></CollapsibleContent></Collapsible>)}</div>;
}

function ColorNuancesSection({ colorData, selection, onToggle }: { colorData: ColorFilters; selection: ColorFilterSelection; onToggle: (slug: string) => void }) {
  return <div><h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" />Acabamento</h5><div className="flex flex-wrap gap-1.5">{colorData.nuances.map(nuance => { const selected = selection.nuances.includes(nuance.slug); return <button key={nuance.id} onClick={() => onToggle(nuance.slug)} className={cn('px-3 py-1.5 rounded-full text-xs transition-all border hover:bg-accent', selected ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border')}>{nuance.name}{selected && <Check className="w-3 h-3 ml-1 inline" />}</button>; })}</div></div>;
}

function ColorFilterContent({ colorData, selection, controller, showVariations, showNuances }: { colorData: ColorFilters; selection: ColorFilterSelection; controller: ColorController; showVariations: boolean; showNuances: boolean }) {
  return <PopoverContent className="w-80 p-0" align="start"><div className="p-3 border-b"><div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Filtrar por Cor</h4>{controller.totalSelected > 0 && <Button variant="ghost" size="sm" onClick={controller.clearAll} className="h-7 text-xs text-muted-foreground hover:text-destructive"><X className="w-3 h-3 mr-1" />Limpar</Button>}</div></div><ScrollArea className="max-h-[50vh] overflow-auto"><div className="p-3 space-y-4 pr-4"><ColorGroupsSection colorData={colorData} selection={selection} onToggle={controller.toggleGroup} />{showVariations && <ColorVariationsSection colorData={colorData} selection={selection} expanded={controller.expandedGroups} onExpand={controller.toggleExpand} onToggle={controller.toggleVariation} />}{showNuances && colorData.nuances.length > 0 && <ColorNuancesSection colorData={colorData} selection={selection} onToggle={controller.toggleNuance} />}</div></ScrollArea>{controller.totalSelected > 0 && <div className="p-3 border-t bg-muted/30"><p className="text-xs text-muted-foreground">{controller.selectedNames.slice(0, 4).join(', ')}{controller.selectedNames.length > 4 && ` +${controller.selectedNames.length - 4} mais`}</p></div>}</PopoverContent>;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function ColorGroupFilter({ selection, onChange, showNuances = true, showVariations = true, className }: ColorGroupFilterProps) {
  const { data: colorDataRaw, isLoading } = useColorSystem();
  const colorData = colorDataRaw as ColorFilters | undefined;
  const controller = useColorFilterController(selection, onChange, colorData);
  if (isLoading) return <div className={cn('space-y-2', className)}><Skeleton className="h-10 w-full" /></div>;
  if (!colorData) return null;
  return (
    <Popover open={controller.isOpen} onOpenChange={controller.setIsOpen}>
      <ColorFilterTrigger controller={controller} colorData={colorData} className={className} />
      <ColorFilterContent colorData={colorData} selection={selection} controller={controller} showVariations={showVariations} showNuances={showNuances} />
    </Popover>
  );
}

// =====================================================
// VERSÃO COMPACTA (apenas swatches inline)
// =====================================================

interface ColorSwatchBarProps {
  selection: ColorFilterSelection;
  onChange: (selection: ColorFilterSelection) => void;
  className?: string;
}

export function ColorSwatchBar({ selection, onChange, className }: ColorSwatchBarProps) {
  const { data: colorDataRaw, isLoading } = useColorSystem();
  const colorData = colorDataRaw as ColorFilters | undefined;

  const toggleGroup = (slug: string) => {
    const newGroups = selection.groups.includes(slug)
      ? selection.groups.filter(g => g !== slug)
      : [...selection.groups, slug];
    
    onChange({ ...selection, groups: newGroups });
  };

  if (isLoading) {
    return (
      <div className={cn('flex gap-1.5', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="w-6 h-6 rounded-full" />
        ))}
      </div>
    );
  }

  if (!colorData) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {colorData.groups.map((group) => (
        <ColorSwatch
          key={group.id}
          hexCode={group.hex_code}
          isSelected={selection.groups.includes(group.slug)}
          onClick={() => toggleGroup(group.slug)}
          label={group.name}
          size="sm"
        />
      ))}
    </div>
  );
}

export default ColorGroupFilter;
