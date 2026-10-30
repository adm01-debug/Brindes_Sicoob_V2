import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { RamoAtividadeGroup, SegmentoComplete } from "@/types/ramo-atividade";
import { SegmentoCheckbox } from "./SegmentoCheckbox";

interface RamoAtividadeGroupAccordionProps {
  group: RamoAtividadeGroup;
  segmentos: SegmentoComplete[];
  isRamoSelected: boolean;
  selectedSegmentos: string[];
  onRamoToggle: (ramoSlug: string) => void;
  onSegmentoToggle: (segmentoSlug: string) => void;
  defaultOpen?: boolean;
  showProductCounts?: boolean;
  compact?: boolean;
  productCountsByRamo?: {
    ramoCounts: Map<string, number>;
    segmentoCounts: Map<string, number>;
  };
}

interface AccordionViewProps extends RamoAtividadeGroupAccordionProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedCount: number;
  hasSelection: boolean;
  allSegmentosSelected: boolean;
}

function getRamoCount(group: RamoAtividadeGroup, counts?: AccordionViewProps['productCountsByRamo']): number {
  return counts?.ramoCounts.get(group.group_name.toLowerCase()) || 0;
}

function SegmentList({ group, segmentos, selectedSegmentos, onSegmentoToggle, compact }: Pick<AccordionViewProps, 'group' | 'segmentos' | 'selectedSegmentos' | 'onSegmentoToggle'> & { compact?: boolean }) {
  return <>{segmentos.map(segmento => <SegmentoCheckbox key={segmento.segmento_id} segmento={segmento} isSelected={selectedSegmentos.includes(segmento.segmento_slug)} onToggle={onSegmentoToggle} ramoHexCode={group.group_hex_code} compact={compact} />)}</>;
}

function CompactGroup(props: AccordionViewProps) {
  const { group, segmentos, isRamoSelected, selectedSegmentos, onRamoToggle, onSegmentoToggle, isOpen, setIsOpen, selectedCount, hasSelection, allSegmentosSelected, productCountsByRamo } = props;
  const ramoCount = getRamoCount(group, productCountsByRamo);
  return <div className={cn("rounded-md overflow-hidden transition-all duration-200", hasSelection ? "bg-primary/5" : "bg-muted/20")}><div className="flex items-center gap-2 p-2"><button type="button" onClick={() => setIsOpen(!isOpen)} className="p-0.5 hover:bg-muted rounded transition-colors" aria-label={`${isOpen ? 'Recolher' : 'Expandir'} segmentos de ${group.group_name}`}><ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} /></button><label className="flex items-center gap-2 flex-1 cursor-pointer"><Checkbox checked={isRamoSelected || allSegmentosSelected} onCheckedChange={() => onRamoToggle(group.group_slug)} className="data-[state=checked]:bg-primary" /><span className={cn("text-sm", hasSelection ? "font-medium text-primary" : "text-foreground")}>{group.group_name}</span></label><span className="text-[10px] text-muted-foreground flex items-center gap-1">{selectedCount > 0 && `${selectedCount}/`}{group.total_segmentos}{ramoCount > 0 && <span className="text-primary/70">· {ramoCount}</span>}</span></div>{isOpen && segmentos.length > 0 && <div className="px-2 pb-2 space-y-0.5 ml-6 border-l-2 border-muted"><SegmentList group={group} segmentos={segmentos} selectedSegmentos={selectedSegmentos} onSegmentoToggle={onSegmentoToggle} compact /></div>}</div>;
}

function FullExpandButton({ group, open, onToggle }: { group: RamoAtividadeGroup; open: boolean; onToggle: () => void }) {
  return <button type="button" onClick={onToggle} className={cn("p-1.5 rounded-lg transition-all duration-200", open ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted")} aria-label={`${open ? 'Recolher' : 'Expandir'} segmentos de ${group.group_name}`}><ChevronDown className={cn("w-4 h-4 transition-transform duration-300", open && "rotate-180")} /></button>;
}

function FullGroupCheckbox({ ramoSelected, allSelected, selectedCount, onToggle }: { ramoSelected: boolean; allSelected: boolean; selectedCount: number; onToggle: () => void }) {
  const partial = selectedCount > 0 && !ramoSelected && !allSelected;
  return <div className="relative"><Checkbox checked={ramoSelected || allSelected} onCheckedChange={onToggle} className="w-5 h-5 transition-all duration-200 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />{partial && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />}</div>;
}

function FullGroupInfo({ group, selected, open }: { group: RamoAtividadeGroup; selected: boolean; open: boolean }) {
  return <div className="flex-1 min-w-0"><span className={cn("font-medium text-sm transition-colors duration-200", selected ? "text-primary" : "text-foreground")}>{group.group_name}</span>{group.group_description && !open && <p className="text-xs text-muted-foreground truncate">{group.group_description}</p>}</div>;
}

function FullGroupCounters({ group, selectedCount, selected, ramoCount }: { group: RamoAtividadeGroup; selectedCount: number; selected: boolean; ramoCount: number }) {
  return <div className="flex items-center gap-2 flex-shrink-0">{selectedCount > 0 && <span className="bg-primary text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center shadow-sm">{selectedCount}</span>}<div className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors", selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}><span className="font-medium">{group.total_segmentos}</span><span className="text-[10px]">seg.</span>{ramoCount > 0 && <span className="text-[10px] text-primary/70 ml-0.5">· {ramoCount}</span>}</div></div>;
}

function FullGroupHeader(props: AccordionViewProps) {
  const { group, isRamoSelected, onRamoToggle, isOpen, setIsOpen, selectedCount, hasSelection, allSegmentosSelected, productCountsByRamo } = props;
  const ramoCount = getRamoCount(group, productCountsByRamo);
  return <div className="flex items-center gap-3 p-3"><FullExpandButton group={group} open={isOpen} onToggle={() => setIsOpen(!isOpen)} /><FullGroupCheckbox ramoSelected={isRamoSelected} allSelected={allSegmentosSelected} selectedCount={selectedCount} onToggle={() => onRamoToggle(group.group_slug)} /><FullGroupInfo group={group} selected={hasSelection} open={isOpen} /><FullGroupCounters group={group} selectedCount={selectedCount} selected={hasSelection} ramoCount={ramoCount} /></div>;
}

function SelectAllSegmentos({ segmentos, selectedSegmentos, allSelected, onToggle }: { segmentos: SegmentoComplete[]; selectedSegmentos: string[]; allSelected: boolean; onToggle: (slug: string) => void }) {
  if (segmentos.length <= 2) return null;
  const handleClick = () => {
    const targets = allSelected ? segmentos : segmentos.filter(segmento => !selectedSegmentos.includes(segmento.segmento_slug));
    targets.forEach(segmento => onToggle(segmento.segmento_slug));
  };
  return <button type="button" onClick={handleClick} className={cn("flex items-center gap-2 w-full text-xs py-1.5 px-2 rounded-md transition-colors mb-1", allSelected ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted/50")}><Check className={cn("w-3 h-3", allSelected ? "opacity-100" : "opacity-30")} /><span>{allSelected ? "Desmarcar todos" : "Selecionar todos"}</span></button>;
}

function FullSegmentPanel(props: AccordionViewProps) {
  const { group, segmentos, selectedSegmentos, onSegmentoToggle, isOpen, allSegmentosSelected } = props;
  const panelClass = isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0";
  if (segmentos.length === 0) return <div className={cn("overflow-hidden transition-all duration-300", panelClass)}><div className="px-3 pb-3"><div className="border-t border-border/30 pt-3 ml-10"><p className="text-xs text-muted-foreground italic text-center py-2">Nenhum segmento neste ramo</p></div></div></div>;
  return <div className={cn("overflow-hidden transition-all duration-300", panelClass)}><div className="px-3 pb-3 space-y-1"><div className="border-t border-border/30 pt-2 ml-10 space-y-0.5"><SelectAllSegmentos segmentos={segmentos} selectedSegmentos={selectedSegmentos} allSelected={allSegmentosSelected} onToggle={onSegmentoToggle} /><SegmentList group={group} segmentos={segmentos} selectedSegmentos={selectedSegmentos} onSegmentoToggle={onSegmentoToggle} /></div></div></div>;
}

function FullGroup(props: AccordionViewProps) {
  return <div className={cn("rounded-xl overflow-hidden transition-all duration-300", props.hasSelection ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ring-1 ring-primary/25 shadow-sm" : "bg-muted/30 hover:bg-muted/40")}><FullGroupHeader {...props} /><FullSegmentPanel {...props} /></div>;
}

export function RamoAtividadeGroupAccordion(props: RamoAtividadeGroupAccordionProps) {
  const { group, segmentos, isRamoSelected, selectedSegmentos, defaultOpen = false, compact = false } = props;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const selectedCount = segmentos.filter(segmento => selectedSegmentos.includes(segmento.segmento_slug)).length;
  const hasSelection = selectedCount > 0 || isRamoSelected;
  const allSegmentosSelected = segmentos.length > 0 && segmentos.every(segmento => selectedSegmentos.includes(segmento.segmento_slug));
  const viewProps: AccordionViewProps = { ...props, group, segmentos, isRamoSelected, selectedSegmentos, isOpen, setIsOpen, selectedCount, hasSelection, allSegmentosSelected };
  if (compact) return <CompactGroup {...viewProps} />;
  return <FullGroup {...viewProps} />;
}
