/**
 * MaterialGroupTree — Group accordion tree extracted from ProductMaterialsSection
 */
import { isNullish } from "@/components/admin/utils/nullish";
import type { ComponentType } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Pencil, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaterialGroup, MaterialType } from '@/services/materialService';

interface LinkedMaterial {
  id: string;
  material_id: string;
  part?: string | null;
  percentage?: number | null;
  notes?: string | null;
}

interface MaterialGroupTreeProps {
  groups: MaterialGroup[];
  typesByGroup: Record<string, MaterialType[]>;
  filteredTypesByGroup: Record<string, MaterialType[]>;
  linkedMaterialIds: Set<string>;
  linkedMap: Map<string, LinkedMaterial>;
  openGroups: Set<string>;
  search: string;
  editingMaterialId: string | null;
  onToggleGroup: (groupId: string) => void;
  onToggleMaterial: (materialId: string, isLinked: boolean) => void;
  onEditMaterial: (materialId: string | null) => void;
  MaterialDetailEditor: ComponentType<{
    linked: LinkedMaterial;
    onSave: (data: { part: string; percentage: number | null; notes: string }) => void;
    onCancel: () => void;
  }>;
  onUpdateMaterialDetail: (materialId: string, data: { part: string; percentage: number | null; notes: string }) => void;
}

interface MaterialTypeRowProps {
  type: MaterialType;
  groupColor: string | null;
  isLinked: boolean;
  linked: LinkedMaterial | undefined;
  isEditing: boolean;
  showLinkedIndicator: boolean;
  detailEditor: MaterialGroupTreeProps['MaterialDetailEditor'];
  onToggleMaterial: MaterialGroupTreeProps['onToggleMaterial'];
  onEditMaterial: MaterialGroupTreeProps['onEditMaterial'];
  onUpdateMaterialDetail: MaterialGroupTreeProps['onUpdateMaterialDetail'];
}

function MaterialTypeRow({ type, groupColor, isLinked, linked, isEditing, showLinkedIndicator, detailEditor, onToggleMaterial, onEditMaterial, onUpdateMaterialDetail }: MaterialTypeRowProps) {
  const detailText = materialDetailText(linked);
  const EditorComponent = detailEditor;
  return (
    <div>
      <label className={cn(
        "flex items-center gap-2.5 py-1.5 px-2.5 rounded-md cursor-pointer text-sm transition-all duration-150",
        isLinked
          ? "bg-primary/15 text-foreground font-medium shadow-sm"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}>
        <Checkbox
          checked={isLinked}
          onCheckedChange={() => onToggleMaterial(type.id, isLinked)}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: groupColor || 'hsl(var(--muted))' }}
        />
        <span className="truncate flex-1">{type.name}</span>
        {detailText && <span className="text-[10px] text-muted-foreground italic">{detailText}</span>}
        {isLinked && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEditMaterial(isEditing ? null : type.id);
            }}
            className="text-muted-foreground hover:text-primary p-0.5"
            title="Editar parte/% / obs"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
        {showLinkedIndicator && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
      </label>
      {isEditing && isLinked && linked && (
        <EditorComponent
          linked={linked}
          onSave={(data) => onUpdateMaterialDetail(type.id, data)}
          onCancel={() => onEditMaterial(null)}
        />
      )}
    </div>
  );
}

function materialDetailText(linked: LinkedMaterial | undefined): string {
  if (linked?.part) return linked.part;
  if (!isNullish(linked?.percentage)) return `${linked.percentage}%`;
  return '';
}

interface MaterialGroupHeaderProps {
  group: MaterialGroup;
  hasAnySelection: boolean;
  isOpen: boolean;
  linkedInGroup: number;
  typeCount: number;
  onToggleGroup: (groupId: string) => void;
}

function MaterialGroupHeader({
  group,
  hasAnySelection,
  isOpen,
  linkedInGroup,
  typeCount,
  onToggleGroup,
}: MaterialGroupHeaderProps) {
  return (
    <div className="flex items-center gap-2 p-2.5">
      <button
        type="button"
        onClick={() => onToggleGroup(group.group_id)}
        className={cn("p-1 rounded-md transition-all duration-200", isOpen ? "bg-primary/10" : "bg-muted hover:bg-muted/80")}
      >
        <ChevronDown className={cn(
          "h-3.5 w-3.5 transition-transform duration-200",
          isOpen ? "rotate-180 text-primary" : "text-muted-foreground",
        )} />
      </button>
      <div
        className={cn(
          "w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background transition-all",
          hasAnySelection ? "ring-primary/50 scale-110" : "ring-border/50",
        )}
        style={{
          backgroundColor: group.group_hex_code || 'hsl(var(--muted))',
          boxShadow: group.group_hex_code ? `0 2px 8px ${group.group_hex_code}40` : 'none',
        }}
      />
      <span className={cn(
        "text-sm font-medium truncate flex-1 transition-colors",
        hasAnySelection ? "text-primary" : "text-foreground",
      )}>{group.group_name}</span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {linkedInGroup > 0 && (
          <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {linkedInGroup}
          </span>
        )}
        <span className={cn(
          "text-[11px] px-1.5 py-0.5 rounded-full",
          hasAnySelection ? "bg-primary/20 text-primary font-medium" : "bg-muted text-muted-foreground",
        )}>{typeCount}</span>
      </div>
    </div>
  );
}

interface MaterialGroupNodeProps extends Pick<MaterialGroupTreeProps,
  'linkedMaterialIds' | 'linkedMap' | 'editingMaterialId' | 'onToggleGroup' |
  'onToggleMaterial' | 'onEditMaterial' | 'onUpdateMaterialDetail'> {
  group: MaterialGroup;
  types: MaterialType[];
  isOpen: boolean;
  detailEditor: MaterialGroupTreeProps['MaterialDetailEditor'];
}

function MaterialGroupNode({ group, types, isOpen, linkedMaterialIds, linkedMap, editingMaterialId, detailEditor, onToggleGroup, onToggleMaterial, onEditMaterial, onUpdateMaterialDetail }: MaterialGroupNodeProps) {
  const linkedInGroup = types.filter((type) => linkedMaterialIds.has(type.id)).length;
  const hasAnySelection = linkedInGroup > 0;
  return (
    <div className={cn(
      "rounded-lg overflow-hidden transition-all duration-200",
      hasAnySelection
        ? "bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/30"
        : "bg-muted/30 hover:bg-muted/50",
    )}>
      <MaterialGroupHeader
        group={group}
        hasAnySelection={hasAnySelection}
        isOpen={isOpen}
        linkedInGroup={linkedInGroup}
        typeCount={types.length}
        onToggleGroup={onToggleGroup}
      />
      {isOpen && types.length > 0 && (
        <div className="px-2.5 pb-2.5 space-y-0.5">
          <div className="border-t border-border/30 pt-2 ml-8">
            {types.map((type) => {
              const isLinked = linkedMaterialIds.has(type.id);
              return (
                <MaterialTypeRow
                  key={type.id}
                  type={type}
                  groupColor={group.group_hex_code}
                  isLinked={isLinked}
                  linked={linkedMap.get(type.id)}
                  isEditing={editingMaterialId === type.id}
                  showLinkedIndicator={isLinked && !editingMaterialId}
                  detailEditor={detailEditor}
                  onToggleMaterial={onToggleMaterial}
                  onEditMaterial={onEditMaterial}
                  onUpdateMaterialDetail={onUpdateMaterialDetail}
                />
              );
            })}
          </div>
        </div>
      )}
      {isOpen && types.length === 0 && <div className="px-2.5 pb-2.5">
          <div className="border-t border-border/30 pt-2 ml-8">
            <p className="text-xs text-muted-foreground italic py-2">Nenhum material neste grupo</p>
          </div>
        </div>}
    </div>
  );
}

function EmptyMaterialSearch({ search }: { search: string }) {
  return (
    <div className="text-center py-6">
      <Search className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">
        Nenhum material encontrado para "<span className="font-medium">{search}</span>"
      </p>
    </div>
  );
}

export function MaterialGroupTree({
  groups, typesByGroup, filteredTypesByGroup, linkedMaterialIds, linkedMap,
  openGroups, search, editingMaterialId,
  onToggleGroup, onToggleMaterial, onEditMaterial,
  MaterialDetailEditor: detailEditor, onUpdateMaterialDetail,
}: MaterialGroupTreeProps) {
  const searchLower = search.toLowerCase();
  const visibleGroups = [...groups]
    .filter(g =>
      !search ||
      g.group_name.toLowerCase().includes(searchLower) ||
      (filteredTypesByGroup[g.group_id]?.length || 0) > 0
    )
    .sort((a, b) => a.group_name.localeCompare(b.group_name, 'pt-BR'));

  if (visibleGroups.length === 0 && search) {
    return <EmptyMaterialSearch search={search} />;
  }

  return (
    <div className="space-y-1.5 pr-3">
      {visibleGroups.map(group => {
        const types = ((filteredTypesByGroup[group.group_id] || typesByGroup[group.group_id] || [])
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
        const isOpen = (openGroups.has(group.group_id) || !!search);
        return (
          <MaterialGroupNode
            key={group.group_id}
            group={group}
            types={types}
            isOpen={isOpen}
            linkedMaterialIds={linkedMaterialIds}
            linkedMap={linkedMap}
            editingMaterialId={editingMaterialId}
            detailEditor={detailEditor}
            onToggleGroup={onToggleGroup}
            onToggleMaterial={onToggleMaterial}
            onEditMaterial={onEditMaterial}
            onUpdateMaterialDetail={onUpdateMaterialDetail}
          />
        );
      })}
    </div>
  );
}
