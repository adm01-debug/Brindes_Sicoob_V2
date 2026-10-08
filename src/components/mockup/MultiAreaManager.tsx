import { useState, type DragEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AreaCard } from "./AreaCard";

export interface PersonalizationArea {
  id: string;
  name: string;
  positionX: number;
  positionY: number;
  logoWidth: number;
  logoHeight: number;
  logoRotation?: number;
  logoScale?: number;
  logoPreview: string | null;
  // ─── Metadata vinda do RPC fn_get_product_customization_options ───
  /** Largura máxima de gravação na área (cm) */
  maxWidthCm?: number | null;
  /** Altura máxima de gravação na área (cm) */
  maxHeightCm?: number | null;
  /** Máximo de cores suportadas na área */
  maxColors?: number | null;
  /** Se a área aceita gravação em superfície curva */
  isCurved?: boolean;
  /** Quantas técnicas estão disponíveis para esta área */
  techniquesAvailable?: number;
}

interface MultiAreaManagerProps {
  areas: PersonalizationArea[];
  activeAreaId: string | null;
  onAreasChange: (areas: PersonalizationArea[]) => void;
  onActiveAreaChange: (areaId: string | null) => void;
  onLogoUpload: (areaId: string, file: File) => void;
  onLogoRemove?: (areaId: string) => void;
  productLocations?: { code: string; name: string; order: number }[] | null;
}

function managerDescription(areas: PersonalizationArea[], dragging: boolean): string {
  if (dragging) return "🎯 Solte a imagem para aplicar como logo";
  const official = areas.some(area => (area.maxWidthCm !== null && area.maxWidthCm !== undefined) || (area.techniquesAvailable !== null && area.techniquesAvailable !== undefined));
  if (official) return `${areas.length} ${areas.length === 1 ? "área oficial do produto" : "áreas oficiais do produto"}`;
  return `${areas.length} ${areas.length === 1 ? "local configurado" : "locais configurados"} para este produto`;
}

function ManagerHeader({ areas, expanded, dragging }: { areas: PersonalizationArea[]; expanded: boolean; dragging: boolean }) {
  return <CardHeader className="pb-3"><CollapsibleTrigger asChild><div className="flex items-center justify-between cursor-pointer hover:opacity-80"><div className="flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /><CardTitle className="text-base">Áreas de Personalização</CardTitle><Badge variant="secondary" className="text-xs">{areas.length} {areas.length === 1 ? "área" : "áreas"}</Badge></div>{expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</div></CollapsibleTrigger><CardDescription className="text-xs">{managerDescription(areas, dragging)}</CardDescription></CardHeader>;
}

function AreasList({ areas, activeAreaId, onActiveAreaChange, onAreasChange, onLogoUpload, onLogoRemove }: Omit<MultiAreaManagerProps, "productLocations">) {
  const removeLogo = (areaId: string) => {
    onAreasChange(areas.map(area => area.id === areaId ? { ...area, logoData: null, logoPreview: null } : area));
    onLogoRemove?.(areaId);
  };
  return <div className="space-y-2">{areas.map((area, index) => <AreaCard key={area.id} area={area} index={index} isActive={activeAreaId === area.id} isReadOnly canRemove={false} onSelect={() => onActiveAreaChange(area.id)} onNameChange={() => undefined} onLogoUpload={file => onLogoUpload(area.id, file)} onLogoRemove={() => removeLogo(area.id)} onRemove={() => undefined} />)}</div>;
}

function useLogoDrop(areas: PersonalizationArea[], activeAreaId: string | null, onLogoUpload: MultiAreaManagerProps["onLogoUpload"]) {
  const [dragging, setDragging] = useState(false);
  const onDragOver = (event: DragEvent) => { event.preventDefault(); event.stopPropagation(); setDragging(true); };
  const onDragLeave = (event: DragEvent) => { event.preventDefault(); setDragging(false); };
  const onDrop = (event: DragEvent) => {
    event.preventDefault(); setDragging(false);
    const file = event.dataTransfer.files?.[0];
    const targetAreaId = activeAreaId || areas[0]?.id;
    if (!file?.type.startsWith("image/") || !targetAreaId) return;
    onLogoUpload(targetAreaId, file);
    toast.success(`Logo aplicado na área "${areas.find(area => area.id === targetAreaId)?.name || "ativa"}"`);
  };
  return { dragging, onDragOver, onDragLeave, onDrop };
}

export function MultiAreaManager({
  areas,
  activeAreaId,
  onAreasChange,
  onActiveAreaChange,
  onLogoUpload,
  onLogoRemove,
}: MultiAreaManagerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const drop = useLogoDrop(areas, activeAreaId, onLogoUpload);

  const activeAreaHasLogo = areas.find((a) => a.id === activeAreaId)?.logoPreview;

  const applyLogoToAllAreas = () => {
    const activeArea = areas.find((a) => a.id === activeAreaId);
    if (!activeArea?.logoPreview) { toast.error("Selecione uma área com logo primeiro"); return; }
    onAreasChange(areas.map((a) => ({ ...a, logoPreview: activeArea.logoPreview })));
    toast.success(`Logo aplicado em ${areas.length} áreas`);
  };

  return (
    <Card
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
      className={cn(
        "transition-all duration-200 border-border/30",
        drop.dragging && "ring-2 ring-primary border-primary bg-primary/5"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <ManagerHeader areas={areas} expanded={isExpanded} dragging={drop.dragging} />

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            <AreasList areas={areas} activeAreaId={activeAreaId} onAreasChange={onAreasChange} onActiveAreaChange={onActiveAreaChange} onLogoUpload={onLogoUpload} onLogoRemove={onLogoRemove} />

            {areas.length > 1 && activeAreaHasLogo && (
              <Button variant="secondary" size="sm" onClick={applyLogoToAllAreas} className="w-full">
                <Copy className="h-4 w-4 mr-1" /> Aplicar Logo em Todas as Áreas
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
