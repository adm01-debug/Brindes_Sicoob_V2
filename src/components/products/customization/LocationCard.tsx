/**
 * LocationCard — Card colapsável por local físico do produto
 * 
 * FLUXO DE SELEÇÃO EM 4 ETAPAS:
 * 1. Área (este card = local físico)
 * 2. Técnica (grupo: Laser, UV Digital, Serigrafia…) — só nome
 * 3. Variação (tabela de preço: Plana, Cilíndrica…) — auto-skip se 1 só
 * 4. Configurar (tamanho + cores + quantidade) → Preço
 */

import { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronUp, Sparkles, Maximize2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { cn } from "@/lib/utils";
import { TechniqueOption } from "./TechniqueOption";
import { VariationSelector } from "./VariationSelector";
import { ConfigurationPanel } from "./ConfigurationPanel";
import type { PrintAreaV2, CustomizationPriceFlat } from "@/hooks/useGravacaoPriceV2";

export interface LocationGroupData {
  groupKey: string;
  componentName: string;
  locationName: string;
  locationCode: string;
  isPrimary: boolean;
  maxWidth: number;
  maxHeight: number;
  areas: PrintAreaV2[];
}

interface LocationCardProps {
  group: LocationGroupData;
  isExpanded: boolean;
  selectedAreaId: string | null;
  quantity: number;
  onToggle: () => void;
  onSelectArea: (areaId: string, priceData: CustomizationPriceFlat | null) => void;
}

// ============================================
// HELPERS
// ============================================

interface TechniqueGroup {
  groupCode: string;
  groupLabel: string;
  areas: PrintAreaV2[];
}

/** Extrai o label do grupo técnico do area_name: "Lado A — Laser" → "Laser" */
function extractTechLabel(areaName: string): string {
  const parts = areaName.split(' — ');
  return parts.length > 1 ? (parts[parts.length - 1] ?? areaName) : areaName;
}

/** Agrupa áreas por grupo_tecnica */
function groupAreasByTechnique(areas: PrintAreaV2[]): TechniqueGroup[] {
  const groups = new Map<string, TechniqueGroup>();

  for (const area of areas) {
    const groupCode = area.grupo_tecnica || extractTechLabel(area.area_name);

    let group = groups.get(groupCode);
    if (!group) {
      group = {
        groupCode,
        groupLabel: extractTechLabel(area.area_name),
        areas: [],
      };
      groups.set(groupCode, group);
    }
    group.areas.push(area);
  }

  return [...groups.values()];
}

/** Count unique technique groups */
function countUniqueTechniques(areas: PrintAreaV2[]): number {
  const unique = new Set<string>();
  for (const a of areas) {
    unique.add(a.grupo_tecnica || extractTechLabel(a.area_name));
  }
  return unique.size;
}

function useLocationSelection(group: LocationGroupData, selectedAreaId: string | null, onSelectArea: LocationCardProps["onSelectArea"]) {
  const [selectedGroupCode, setSelectedGroupCode] = useState<string | null>(null);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(selectedAreaId);
  const techniqueGroups = useMemo(() => groupAreasByTechnique(group.areas), [group.areas]);
  const selectedTechGroup = useMemo(() => selectedGroupCode ? techniqueGroups.find((item) => item.groupCode === selectedGroupCode) ?? null : null, [techniqueGroups, selectedGroupCode]);
  const selectedArea = useMemo(() => selectedVariationId ? group.areas.find((item) => item.area_id === selectedVariationId) ?? null : null, [group.areas, selectedVariationId]);
  const selectTechnique = useCallback((groupCode: string) => {
    if (selectedGroupCode === groupCode) { setSelectedGroupCode(null); setSelectedVariationId(null); onSelectArea(selectedAreaId || "", null); return; }
    setSelectedGroupCode(groupCode); setSelectedVariationId(null);
  }, [selectedGroupCode, selectedAreaId, onSelectArea]);
  return { selectedGroupCode, selectedVariationId, setSelectedVariationId, techniqueGroups, selectedTechGroup, selectedArea, selectTechnique };
}

function LocationHeader({ group, isExpanded, hasSelection }: { group: LocationGroupData; isExpanded: boolean; hasSelection: boolean }) {
  const techniqueCount = countUniqueTechniques(group.areas);
  const iconStyle = hasSelection ? "bg-primary text-primary-foreground" : isExpanded ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground";
  return (
    <CollapsibleTrigger asChild>
      <button className="w-full p-4 flex items-center justify-between text-left">
        <div className="flex items-center gap-3"><div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-colors", iconStyle)}><Sparkles className="h-4 w-4" /></div>
          <div><p className="font-medium text-foreground">{group.componentName} — {group.locationName}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-sm text-muted-foreground flex items-center gap-1"><Maximize2 className="h-3 w-3" />até {group.maxWidth}×{group.maxHeight}cm</span><span className="text-sm text-muted-foreground">· {techniqueCount} técnica{techniqueCount !== 1 ? "s" : ""}</span></div></div>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>
    </CollapsibleTrigger>
  );
}

function LocationSteps({ selection, quantity, onSelectArea, isExpanded }: { selection: ReturnType<typeof useLocationSelection>; quantity: number; onSelectArea: LocationCardProps["onSelectArea"]; isExpanded: boolean }) {
  return (
    <CollapsibleContent forceMount><div className={cn("px-4 pb-4 space-y-3", !isExpanded && "hidden")}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Etapa 2 · Escolha a técnica</p>
      <div className="space-y-1.5">{selection.techniqueGroups.map((group) => <TechniqueOption key={group.groupCode} groupCode={group.groupCode} groupLabel={group.groupLabel} isSelected={selection.selectedGroupCode === group.groupCode} onSelect={selection.selectTechnique} />)}</div>
      {selection.selectedTechGroup && <VariationSelector variations={selection.selectedTechGroup.areas} selectedAreaId={selection.selectedVariationId} onSelect={selection.setSelectedVariationId} />}
      {selection.selectedArea && <ConfigurationPanel key={selection.selectedArea.area_id} area={selection.selectedArea} quantity={quantity} onPriceCalculated={onSelectArea} />}
    </div></CollapsibleContent>
  );
}

// ============================================
// COMPONENT
// ============================================

export function LocationCard({
  group,
  isExpanded,
  selectedAreaId,
  quantity,
  onToggle,
  onSelectArea,
}: LocationCardProps) {
  const hasSelection = selectedAreaId !== null;
  const selection = useLocationSelection(group, selectedAreaId, onSelectArea);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div
        className={cn(
          "rounded-xl border transition-all duration-200",
          hasSelection
            ? "bg-card border-primary/40 shadow-lg shadow-primary/5"
            : isExpanded
              ? "bg-card border-primary/20 shadow-md shadow-primary/5"
              : "bg-card/50 border-border hover:border-primary/20 hover:bg-card"
        )}
      >
        <LocationHeader group={group} isExpanded={isExpanded} hasSelection={hasSelection} />
        <LocationSteps selection={selection} quantity={quantity} onSelectArea={onSelectArea} isExpanded={isExpanded} />
      </div>
    </Collapsible>
  );
}
