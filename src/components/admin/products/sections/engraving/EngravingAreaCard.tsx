/**
 * EngravingAreaCard — Renders a single engraving area in the list
 */
import { isNullish } from "@/components/admin/utils/nullish";
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Trash2, ChevronDown, ChevronUp, Ruler, Palette, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type EnrichedArea, getTechniqueIcon, getTechniqueColor } from "./types";

interface EngravingAreaCardProps {
  area: EnrichedArea;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function areaLocationName(area: EnrichedArea): string {
  return area.location_name || area.location_code;
}

function areaDimensions(area: EnrichedArea): string {
  if (!area.max_width || !area.max_height) return '—';
  return `${area.max_width} × ${area.max_height} cm`;
}

function moneyOrFallback(value: number | null | undefined, fallback: string): string {
  return value ? `R$ ${value}` : fallback;
}

function AreaSummary({ area, displayName, techniqueCode, isExpanded, onToggleExpand, onToggleActive, onDelete }: EngravingAreaCardProps & { displayName: string; techniqueCode: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{getTechniqueIcon(techniqueCode)}</span>
          <span className="text-sm font-medium">{displayName}</span>
          <Badge variant="outline" className={cn('text-[10px] h-4 gap-0.5', `bg-gradient-to-r ${getTechniqueColor(techniqueCode)}`)}>{area.technique_code || area.technique_name}</Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5 font-mono">{area.location_code}</span>
          {area.max_width && area.max_height && <span className="flex items-center gap-0.5"><Ruler className="h-2.5 w-2.5" />{area.max_width}×{area.max_height}cm</span>}
          {!isNullish(area.max_colors) && area.max_colors > 0 && <span className="flex items-center gap-0.5"><Palette className="h-2.5 w-2.5" />{area.max_colors} cores</span>}
          {!isNullish(area.setup_cost) && area.setup_cost > 0 && <span className="flex items-center gap-0.5"><DollarSign className="h-2.5 w-2.5" />Setup R${area.setup_cost}</span>}
          {area.is_curved && <span className="text-[10px] px-1 py-0.5 rounded bg-muted">curva</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onToggleExpand} className="p-1 rounded hover:bg-muted transition-colors">{isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
        <button type="button" onClick={onToggleActive} className="p-1 rounded hover:bg-muted transition-colors"><Switch checked={area.is_active} className="scale-75" /></button>
        <button type="button" onClick={onDelete} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function ExpandedAreaDetails({ area, expanded }: { area: EnrichedArea; expanded: boolean }) {
  if (!expanded) return null;
  return (
    <div className="px-3 pb-3 pt-0 border-t border-border/30 mt-1">
      <div className="grid grid-cols-4 gap-3 pt-2 text-xs">
        <div><span className="text-muted-foreground">Local</span><p className="font-medium mt-0.5">{areaLocationName(area)}</p></div>
        <div><span className="text-muted-foreground">Dimensões máx.</span><p className="font-medium mt-0.5">{areaDimensions(area)}</p></div>
        <div><span className="text-muted-foreground">Custo Setup (técnica)</span><p className="font-medium mt-0.5">{moneyOrFallback(area.setup_cost, '—')}</p></div>
        <div><span className="text-muted-foreground">Custo Unit. (sobrescrito)</span><p className="font-medium mt-0.5">{moneyOrFallback(area.unit_cost, '— (usa tabela)')}</p></div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
        <div><span className="text-muted-foreground">Técnica</span><p className="font-medium mt-0.5">{area.technique_name}</p></div>
        <div><span className="text-muted-foreground">Grupo</span><p className="font-medium mt-0.5">{area.technique_group || '—'}</p></div>
        <div><span className="text-muted-foreground">Forma</span><p className="font-medium mt-0.5">{area.shape}{area.is_curved ? ' (curva)' : ''}</p></div>
      </div>
      {area.notes && <p className="text-xs text-muted-foreground mt-2 italic">{area.notes}</p>}
    </div>
  );
}

export function EngravingAreaCard({ area, isExpanded, onToggleExpand, onToggleActive, onDelete }: EngravingAreaCardProps) {
  const areaDisplayName = `${areaLocationName(area)} — ${area.technique_name}`;
  const techCode = (area.technique_code || area.technique_group || '');

  return (
    <div
      className={cn(
        'group rounded-lg border transition-all duration-200',
        (area.is_active ? 'border-border/50 bg-card/60 hover:border-border hover:shadow-sm' : 'border-border/20 bg-muted/20 opacity-60'),
      )}
    >
      <AreaSummary area={area} displayName={areaDisplayName} techniqueCode={techCode} isExpanded={isExpanded} onToggleExpand={onToggleExpand} onToggleActive={onToggleActive} onDelete={onDelete} />
      <ExpandedAreaDetails area={area} expanded={isExpanded} />
    </div>
  );
}
