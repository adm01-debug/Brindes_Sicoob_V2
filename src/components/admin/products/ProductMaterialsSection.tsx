/**
 * ProductMaterialsSection — Seletor hierárquico de materiais (padrão Super Filtro)
 * Enriquecido com: part (parte do produto), percentage (composição %), notes
 */

import { isNullish } from "@/components/admin/utils/nullish";
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { materialService, type MaterialGroup, type MaterialType } from '@/services/materialService';
import { supabase } from '@/integrations/supabase/client';
import { MaterialBadge } from '@/components/materials/MaterialBadge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { X, Search, Gem, Save, Pencil } from "lucide-react";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MaterialGroupTree } from './MaterialGroupTree';

const PRODUCT_MATERIALS_QUERY_KEY = 'product-materials-full';
const EXTERNAL_DB_BRIDGE = 'external-db-bridge';

interface ProductMaterialsSectionProps {
  productId: string;
}

interface LinkedMaterial {
  id: string;
  material_id: string;
  part?: string | null;
  percentage?: number | null;
  notes?: string | null;
}

// Inline edit form for material detail fields
function MaterialDetailEditor({
  linked,
  onSave,
  onCancel,
}: {
  linked: LinkedMaterial;
  onSave: (data: { part: string; percentage: number | null; notes: string }) => void;
  onCancel: () => void;
}) {
  const [part, setPart] = useState(linked.part || '');
  const [percentage, setPercentage] = useState<string>(!isNullish(linked.percentage) ? String(linked.percentage) : '');
  const [notes, setNotes] = useState(linked.notes || '');

  return (
    <div className="flex items-center gap-2 mt-1 ml-7">
      <Input
        value={part}
        onChange={(e) => setPart(e.target.value)}
        placeholder="Parte (ex: corpo)"
        className="h-6 text-[11px] w-24 px-1.5"
      />
      <Input
        type="number"
        value={percentage}
        onChange={(e) => setPercentage(e.target.value)}
        placeholder="%"
        min="0"
        max="100"
        className="h-6 text-[11px] w-16 px-1.5"
      />
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Obs..."
        className="h-6 text-[11px] flex-1 px-1.5"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon" aria-label="Salvar"
        className="h-6 w-6"
        onClick={() => onSave({ part, percentage: percentage ? parseFloat(percentage) : null, notes })}
      >
        <Save className="h-3 w-3 text-primary" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel} aria-label="Fechar"><X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function materialBadgeName(typeName: string, linked: LinkedMaterial | undefined): string {
  const hasDetail = Boolean(linked?.part) || !isNullish(linked?.percentage);
  if (!hasDetail) return typeName;
  const part = linked?.part ?? '';
  const percentage = isNullish(linked?.percentage) ? '' : ` ${linked.percentage}%`;
  return `${typeName} (${part}${percentage})`;
}

function SelectedMaterialItem({ type, group, linked, editing, onToggleEdit, onRemove }: { type: MaterialType; group: MaterialGroup | undefined; linked: LinkedMaterial | undefined; editing: boolean; onToggleEdit: () => void; onRemove: () => void }) {
  return <div className="flex items-center gap-0.5"><MaterialBadge name={materialBadgeName(type.name, linked)} hexCode={group?.group_hex_code} size="sm" variant="outline" onRemove={onRemove} /><button type="button" onClick={onToggleEdit} className={cn("text-muted-foreground hover:text-primary p-0.5", editing && "text-primary")} title="Editar detalhes (parte, %, obs)"><Pencil className="h-2.5 w-2.5" /></button></div>;
}

function SelectedMaterials({ allTypes, groups, linkedIds, linkedMap, editingId, onEdit, onRemove, onClear, onUpdate }: { allTypes: MaterialType[]; groups: MaterialGroup[]; linkedIds: Set<string>; linkedMap: Map<string, LinkedMaterial>; editingId: string | null; onEdit: (id: string | null) => void; onRemove: (id: string) => void; onClear: () => void; onUpdate: (id: string, data: { part: string; percentage: number | null; notes: string }) => void }) {
  if (linkedIds.size === 0) return null;
  const selected = allTypes.filter((type) => linkedIds.has(type.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const editing = editingId ? linkedMap.get(editingId) : undefined;
  return (
    <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20"><div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-primary flex items-center gap-1.5"><Gem className="h-3 w-3" />Selecionados</span><button type="button" onClick={onClear} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">Limpar todos</button></div><div className="flex flex-wrap gap-1.5">{selected.map((type) => <SelectedMaterialItem key={type.id} type={type} group={groups.find((group) => group.group_id === type.group_id)} linked={linkedMap.get(type.id)} editing={editingId === type.id} onToggleEdit={() => onEdit(editingId === type.id ? null : type.id)} onRemove={() => onRemove(type.id)} />)}</div>{editing && editingId && <MaterialDetailEditor linked={editing} onSave={(data) => onUpdate(editingId, data)} onCancel={() => onEdit(null)} />}</div>
  );
}

function filterTypes(typesByGroup: Record<string, MaterialType[]>, search: string): Record<string, MaterialType[]> {
  if (!search) return typesByGroup;
  const query = search.toLowerCase();
  return Object.fromEntries(Object.entries(typesByGroup).map(([groupId, types]) => [groupId, types.filter((type) => type.name.toLowerCase().includes(query))]));
}

export function ProductMaterialsSection({ productId }: ProductMaterialsSectionProps) {
  const queryClient = useQueryClient();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);

  const { data: groupsData, isLoading: loadingGroups } = useQuery({
    queryKey: ['material-groups-admin'],
    queryFn: () => materialService.getGroups(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: typesData, isLoading: loadingTypes } = useQuery({
    queryKey: ['material-types-admin'],
    queryFn: () => materialService.getTypes(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch full linked records (with part, percentage, notes)
  const { data: linkedRecords = [], isLoading: loadingProductMaterials } = useQuery<LinkedMaterial[]>({
    queryKey: [PRODUCT_MATERIALS_QUERY_KEY, productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
        body: {
          table: 'product_materials',
          operation: 'select',
          filters: { product_id: productId },
          limit: 200,
        },
      });
      if (error) throw new Error(error.message);
      return data?.data?.records || [];
    },
    enabled: !!productId,
  });

  const linkedMap = useMemo(() => new Map<string, LinkedMaterial>(linkedRecords.map((record) => [record.material_id, record])), [linkedRecords]);
  const linkedMaterialIds = useMemo(() => new Set<string>(linkedMap.keys()), [linkedMap]);
  const allTypes = useMemo(() => typesData?.types ?? [], [typesData?.types]);
  const groups = useMemo(() => groupsData?.groups ?? [], [groupsData?.groups]);

  const typesByGroup = useMemo(() => allTypes.reduce<Record<string, MaterialType[]>>((acc, t) => {
    const gid = t.group_id;
    if (!acc[gid]) acc[gid] = [];
    acc[gid].push(t);
    return acc;
  }, {}), [allTypes]);

  const toggleMaterial = useCallback(async (materialId: string, isLinked: boolean) => {
    try {
      if (isLinked) {
        const linked = linkedMap.get(materialId);
        if (!linked?.id) { toast.error('Registro não encontrado'); return; }
        const { error: delError } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
          body: { table: 'product_materials', operation: 'delete', id: linked.id },
        });
        if (delError) throw new Error(delError.message);
        toast.success('Material removido');
      } else {
        const { error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
          body: {
            table: 'product_materials',
            operation: 'insert',
            data: { product_id: productId, material_id: materialId },
          },
        });
        if (error) throw new Error(error.message);
        toast.success('Material adicionado');
      }
      queryClient.invalidateQueries({ queryKey: [PRODUCT_MATERIALS_QUERY_KEY, productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar material');
    }
  }, [productId, queryClient, linkedMap]);

  const updateMaterialDetail = useCallback(async (
    materialId: string,
    data: { part: string; percentage: number | null; notes: string }
  ) => {
    const linked = linkedMap.get(materialId);
    if (!linked?.id) return;

    try {
      const { error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
        body: {
          table: 'product_materials',
          operation: 'update',
          id: linked.id,
          data: {
            part: data.part.trim() || null,
            percentage: data.percentage,
            notes: data.notes.trim() || null,
          },
        },
      });
      if (error) throw new Error(error.message);
      toast.success('Detalhes atualizados');
      setEditingMaterialId(null);
      queryClient.invalidateQueries({ queryKey: [PRODUCT_MATERIALS_QUERY_KEY, productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  }, [productId, queryClient, linkedMap]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const clearAll = useCallback(async () => {
    const linkedTypes = allTypes.filter(t => linkedMaterialIds.has(t.id));
    for (const t of linkedTypes) {
      await toggleMaterial(t.id, true);
    }
  }, [allTypes, linkedMaterialIds, toggleMaterial]);

  const isLoading = (loadingGroups || loadingTypes || loadingProductMaterials);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <Gem className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum material disponível</p>
      </div>
    );
  }

  const linkedCount = linkedMaterialIds.size;
  const filteredTypesByGroup = filterTypes(typesByGroup, search);

  return (
    (<div className="space-y-3">
      {/* Badges dos materiais selecionados — padrão Super Filtro */}
      <SelectedMaterials allTypes={allTypes} groups={groups} linkedIds={linkedMaterialIds} linkedMap={linkedMap} editingId={editingMaterialId} onEdit={setEditingMaterialId} onRemove={(id) => void toggleMaterial(id, true)} onClear={() => void clearAll()} onUpdate={(id, data) => void updateMaterialDetail(id, data)} />

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar material ou grupo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-sm pl-8 pr-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span>{groups.length} grupos</span>
        <span>•</span>
        <span>{allTypes.length} materiais</span>
        <span>•</span>
        <span className={cn("font-medium", linkedCount > 0 && "text-primary")}>
          {linkedCount} selecionados
        </span>
      </div>

      <ScrollArea className="h-56">
        <MaterialGroupTree
          groups={groups}
          typesByGroup={typesByGroup}
          filteredTypesByGroup={filteredTypesByGroup}
          linkedMaterialIds={linkedMaterialIds}
          linkedMap={linkedMap}
          openGroups={openGroups}
          search={search}
          editingMaterialId={editingMaterialId}
          onToggleGroup={toggleGroup}
          onToggleMaterial={toggleMaterial}
          onEditMaterial={setEditingMaterialId}
          MaterialDetailEditor={MaterialDetailEditor}
          onUpdateMaterialDetail={updateMaterialDetail}
        />
      </ScrollArea>
    </div>)
  );
}
