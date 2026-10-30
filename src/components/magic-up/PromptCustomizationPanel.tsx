/**
 * PromptCustomizationPanel — Location/technique selector extracted from PromptGenerator
 */
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MapPin, Paintbrush, Ruler } from "lucide-react";
import type { PrintAreaWithTechniques } from "@/types/gravacao";

interface PromptCustomizationPanelProps {
  printAreas: PrintAreaWithTechniques[];
  selectedAreaId: string | null;
  selectedTechId: string | null;
  onAreaChange: (areaId: string) => void;
  onTechChange: (techId: string) => void;
}

type PrintTechnique = NonNullable<PrintAreaWithTechniques["techniques"]>[number];

function areaLabel(area: PrintAreaWithTechniques): string {
  return [area.component_name, area.location_name].filter(Boolean).join(" — ") || area.area_code;
}

function AreaSelector({ areas, value, onChange }: { areas: PrintAreaWithTechniques[]; value: string | null; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1"><Label className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Local</Label>
      <Select value={value || "none"} onValueChange={onChange}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="none" className="text-xs">Nenhum</SelectItem>{areas.map(area => <SelectItem key={area.area_id} value={area.area_id} className="text-xs">{areaLabel(area)}{area.max_width > 0 && <span className="text-muted-foreground ml-1">({area.max_width}×{area.max_height}{area.unit})</span>}</SelectItem>)}</SelectContent></Select>
    </div>
  );
}

function TechniqueSelector({ techniques, areaId, value, onChange }: { techniques: PrintTechnique[]; areaId: string | null; value: string | null; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1"><Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Paintbrush className="h-3 w-3" /> Técnica</Label>
      <Select value={value || "none"} onValueChange={onChange} disabled={!areaId || techniques.length === 0}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder={areaId ? "Selecione..." : "Escolha local primeiro"} /></SelectTrigger><SelectContent><SelectItem value="none" className="text-xs">Nenhuma</SelectItem>{techniques.map(technique => <SelectItem key={technique.id} value={technique.id} className="text-xs">{technique.nome}</SelectItem>)}</SelectContent></Select>
    </div>
  );
}

function AreaDimensions({ area }: { area: PrintAreaWithTechniques | null }) {
  if (!area || area.max_width <= 0) return null;
  return <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Ruler className="h-3 w-3 shrink-0" /><span>Área máxima: <strong className="text-foreground">{area.max_width} × {area.max_height} {area.unit}</strong>{area.is_curved && <Badge variant="outline" className="text-[8px] ml-1.5 px-1 py-0">Superfície curva</Badge>}</span></div>;
}

function SelectionBadges({ area, technique }: { area: PrintAreaWithTechniques | null; technique: PrintTechnique | null }) {
  if (!area && !technique) return null;
  const location = area ? areaLabel(area) : null;
  return <div className="flex flex-wrap gap-1">{location && <Badge variant="secondary" className="text-[9px] gap-1"><MapPin className="h-2.5 w-2.5" /> {location}</Badge>}{technique && <Badge variant="secondary" className="text-[9px] gap-1"><Paintbrush className="h-2.5 w-2.5" /> {technique.nome}</Badge>}</div>;
}

export function PromptCustomizationPanel({
  printAreas, selectedAreaId, selectedTechId, onAreaChange, onTechChange,
}: PromptCustomizationPanelProps) {
  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null;
    return printAreas.find(a => a.area_id === selectedAreaId) || null;
  }, [selectedAreaId, printAreas]);

  const availableTechniques = useMemo(() => {
    if (!selectedArea) return [];
    return selectedArea.techniques || [];
  }, [selectedArea]);

  const selectedTech = useMemo(() => {
    if (!selectedTechId) return null;
    return availableTechniques.find(t => t.id === selectedTechId) || null;
  }, [selectedTechId, availableTechniques]);

  return (
    <div className="space-y-2.5 p-3 rounded-lg border border-primary/20 bg-primary/5">
      <p className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5" />
        Personalização do Produto
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        <AreaSelector areas={printAreas} value={selectedAreaId} onChange={onAreaChange} />
        <TechniqueSelector techniques={availableTechniques} areaId={selectedAreaId} value={selectedTechId} onChange={onTechChange} />
      </div>
      <AreaDimensions area={selectedArea} />
      <SelectionBadges area={selectedArea} technique={selectedTech} />
    </div>
  );
}
