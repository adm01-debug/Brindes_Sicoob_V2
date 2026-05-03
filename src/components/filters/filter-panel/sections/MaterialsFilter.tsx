import React from "react";
import { Search, X, Gem, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MaterialBadge } from "@/components/materials/MaterialBadge";
import { cn } from "@/lib/utils";

interface MaterialsFilterProps {
  materialSearch: string;
  setMaterialSearch: (v: string) => void;
  materialGroups: any[];
  allMaterials: any[];
  materialsLoading: boolean;
  materialFilterState: { selectedGroups: string[]; selectedTypes: string[] };
  toggleMaterialGroup: (slug: string) => void;
  toggleMaterialType: (slug: string) => void;
  isMaterialGroupSelected: (slug: string) => boolean;
  getTypesForGroup: (slug: string) => any[];
  openSections: string[];
  toggleSection: (id: string) => void;
}

export function MaterialsFilter({
  materialSearch, setMaterialSearch,
  materialGroups, allMaterials, materialsLoading, materialFilterState,
  toggleMaterialGroup, toggleMaterialType, isMaterialGroupSelected, getTypesForGroup,
  openSections, toggleSection,
}: MaterialsFilterProps) {
  return (
    <div className="space-y-3">
      {(materialFilterState.selectedGroups.length > 0 || materialFilterState.selectedTypes.length > 0) && (
        <div className="p-2.5 bg-orange/5 rounded-lg border border-orange/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-orange flex items-center gap-1.5">
              <Gem className="h-3 w-3" />
              Selecionados
            </span>
            <button
              type="button"
              onClick={() => {
                materialFilterState.selectedGroups.forEach(slug => toggleMaterialGroup(slug));
                materialFilterState.selectedTypes.forEach(slug => toggleMaterialType(slug));
              }}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Limpar todos os produtos selecionados"
            >
              Limpar todos
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {materialFilterState.selectedGroups.map(slug => {
              const group = materialGroups.find(g => g.group_slug === slug);
              return group ? (
                <MaterialBadge key={`group-${slug}`} name={group.group_name} hexCode={group.group_hex_code} size="sm" variant="solid" onRemove={() => toggleMaterialGroup(slug)} />
              ) : null;
            })}
            {materialFilterState.selectedTypes.map(slug => {
              const material = allMaterials.find(m => m.type_slug === slug);
              const group = material ? materialGroups.find(g => g.group_slug === material.group_slug) : null;
              return material ? (
                <MaterialBadge key={`type-${slug}`} name={material.type_name} hexCode={group?.group_hex_code} size="sm" variant="outline" onRemove={() => toggleMaterialType(slug)} />
              ) : null;
            })}
          </div>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Buscar produto..." value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} className="h-8 text-sm pl-8 pr-8" aria-label="Buscar produto por nome" />
        {materialSearch && (
          <button type="button" onClick={() => setMaterialSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar busca de produto">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span>{materialGroups.length} grupos</span>
        <span>•</span>
        <span>{allMaterials.length} materiais</span>
        <span>•</span>
        <span className="text-orange font-medium">
          {materialFilterState.selectedGroups.length + materialFilterState.selectedTypes.length} selecionados
        </span>
      </div>
      {materialsLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : (
        <ScrollArea className="h-48">
          <div className="space-y-1.5 pr-3">
            {[...materialGroups]
              .sort((a, b) => a.group_name.localeCompare(b.group_name, 'pt-BR'))
              .filter(g => !materialSearch || g.group_name.toLowerCase().includes(materialSearch.toLowerCase()) || getTypesForGroup(g.group_slug).some(t => t.type_name.toLowerCase().includes(materialSearch.toLowerCase())))
              .map(group => {
                const types = getTypesForGroup(group.group_slug);
                const isOpen = openSections.includes(`mat-${group.group_slug}`);
                const isSelected = isMaterialGroupSelected(group.group_slug);
                const selectedTypesCount = types.filter(t => materialFilterState.selectedTypes.includes(t.type_slug)).length;
                const hasSelection = isSelected || selectedTypesCount > 0;
                return (
                  <div key={group.group_slug} className={cn("rounded-lg border transition-all", hasSelection ? "border-orange/30 bg-orange/5" : "border-border/50 hover:border-border")}>
                    <div className="flex items-center gap-2 p-2">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleMaterialGroup(group.group_slug)} className="h-4 w-4" />
                      <button type="button" onClick={() => toggleSection(`mat-${group.group_slug}`)} className="flex-1 flex items-center justify-between text-left" aria-label={`${isOpen ? 'Recolher' : 'Expandir'} tipos de ${group.group_name}`}>
                        <span className={cn("text-sm font-medium", hasSelection && "text-orange")}>{group.group_name}</span>
                        <div className="flex items-center gap-1.5">
                          {selectedTypesCount > 0 && <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{selectedTypesCount}</Badge>}
                          <Badge variant="outline" className="h-4 text-[10px] px-1.5">{types.length}</Badge>
                          {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                      </button>
                    </div>
                    {isOpen && types.length > 0 && (
                      <div className="px-2 pb-2 pt-1 border-t border-border/30">
                        <div className="space-y-1 pl-6">
                          {[...types].sort((a, b) => a.type_name.localeCompare(b.type_name, 'pt-BR')).filter(t => !materialSearch || t.type_name.toLowerCase().includes(materialSearch.toLowerCase())).map(type => {
                            const isTypeSelected = materialFilterState.selectedTypes.includes(type.type_slug);
                            return (
                              <div key={type.type_slug} className={cn("flex items-center gap-2 py-1 px-2 rounded-md transition-colors", isTypeSelected ? "bg-orange/10" : "hover:bg-muted/50")}>
                                <Checkbox checked={isTypeSelected} onCheckedChange={() => toggleMaterialType(type.type_slug)} className="h-3.5 w-3.5" />
                                <Label className="text-xs cursor-pointer flex-1">{type.type_name}</Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            {materialGroups.filter(g => !materialSearch || g.group_name.toLowerCase().includes(materialSearch.toLowerCase()) || getTypesForGroup(g.group_slug).some(t => t.type_name.toLowerCase().includes(materialSearch.toLowerCase()))).length === 0 && (
              <p className="text-sm text-muted-foreground py-2 text-center">Nenhum material encontrado</p>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
