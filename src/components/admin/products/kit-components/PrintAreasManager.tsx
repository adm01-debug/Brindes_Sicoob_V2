import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Target, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PrintAreaForm } from './PrintAreaForm';
import { fetchPrintAreas, createPrintArea, updatePrintArea, deletePrintArea } from './api';
import { type PrintArea, type PrintAreaFormData, EMPTY_PRINT_AREA } from "./types";

interface AreaRowProps {
  area: PrintArea;
  editing: boolean;
  isSaving: boolean;
  onCancelEdit: () => void;
  onDelete: (area: PrintArea) => void;
  onEdit: (areaId: string) => void;
  onUpdate: (areaId: string, data: PrintAreaFormData) => void;
}

function initialFormData(area: PrintArea): PrintAreaFormData {
  return {
    location_code: area.location_code || '',
    location_name: area.location_name || '',
    technique_name: area.technique_name || '',
    technique_id: area.technique_id || '',
    max_width_mm: area.max_width_mm,
    max_height_mm: area.max_height_mm,
    tabela_preco_id: area.tabela_preco_id || '',
    display_order: area.display_order ?? 0,
    notes: area.notes || '',
  };
}

function printAreaName(area: PrintArea): string {
  return area.location_name || area.location_code || 'Sem local';
}

function PrintAreaDisplay({
  area,
  onDelete,
  onEdit,
}: Pick<AreaRowProps, 'area' | 'onDelete' | 'onEdit'>) {
  const techniqueBadge = area.area_name?.includes(' — ')
    ? area.area_name.split(' — ')[1]
    : area.technique_name;
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/50 p-1.5 text-[10px] group hover:bg-accent/30 transition-colors">
      <Target className="h-3 w-3 text-primary/60 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium truncate">{printAreaName(area)}</span>
          {techniqueBadge && <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">{techniqueBadge}</Badge>}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {(area.max_width_mm || area.max_height_mm) && <span>{area.max_width_mm ?? '?'}×{area.max_height_mm ?? '?'} mm</span>}
          {area.location_code && <span className="font-mono">{area.location_code}</span>}
        </div>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button type="button" variant="ghost" size="icon" aria-label="Editar" className="h-5 w-5" onClick={() => onEdit(area.id)}>
          <Pencil className="h-2.5 w-2.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Excluir" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => onDelete(area)}>
          <Trash2 className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}

function PrintAreaRow({ area, editing, isSaving, onCancelEdit, onDelete, onEdit, onUpdate }: AreaRowProps) {
  if (editing) {
    return (
      <PrintAreaForm
        initial={initialFormData(area)}
        onSave={(data) => onUpdate(area.id, data)}
        onCancel={onCancelEdit}
        isSaving={isSaving}
      />
    );
  }
  return <PrintAreaDisplay area={area} onDelete={onDelete} onEdit={onEdit} />;
}

function LoadingError({ error }: { error: unknown }) {
  if (!error) return null;
  const missingTable = error instanceof Error && error.message.includes('kit_component_print_areas');
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-destructive py-1">
      <AlertCircle className="h-3 w-3" />
      {missingTable ? 'Tabela kit_component_print_areas não existe no banco externo. Crie-a primeiro.' : 'Erro ao carregar áreas'}
    </div>
  );
}

interface PrintAreaListProps {
  areas: PrintArea[];
  editingId: string | null;
  error: unknown;
  isCreating: boolean;
  isLoading: boolean;
  isSaving: boolean;
  onCancelCreate: () => void;
  onCancelEdit: () => void;
  onCreate: (data: PrintAreaFormData) => void;
  onDelete: (area: PrintArea) => void;
  onEdit: (areaId: string) => void;
  onStartCreate: () => void;
  onUpdate: (areaId: string, data: PrintAreaFormData) => void;
}

function PrintAreaList(props: PrintAreaListProps) {
  return (
    <div className="ml-6 mt-1.5 space-y-1.5">
      {props.isLoading && <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground py-1"><Loader2 className="h-3 w-3 animate-spin" /> Carregando áreas...</div>}
      <LoadingError error={props.error} />
      {!props.isLoading && !props.error && props.areas.length === 0 && !props.isCreating && <p className="text-[10px] text-muted-foreground py-1">Nenhuma área cadastrada</p>}
      {props.areas.map((area) => (
        <PrintAreaRow
          key={area.id}
          area={area}
          editing={props.editingId === area.id}
          isSaving={props.isSaving}
          onCancelEdit={props.onCancelEdit}
          onDelete={props.onDelete}
          onEdit={props.onEdit}
          onUpdate={props.onUpdate}
        />
      ))}
      {props.isCreating && (
        <PrintAreaForm
          initial={{ ...EMPTY_PRINT_AREA, display_order: props.areas.length }}
          onSave={props.onCreate}
          onCancel={props.onCancelCreate}
          isSaving={props.isSaving}
        />
      )}
      {!props.isCreating && !props.error && (
        <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 gap-0.5" onClick={props.onStartCreate}>
          <Plus className="h-2.5 w-2.5" /> Área
        </Button>
      )}
    </div>
  );
}

function PrintAreasTrigger({ areaCount, isOpen }: { areaCount: number; isOpen: boolean }) {
  return (
    <CollapsibleTrigger asChild>
      <button
        type="button"
        className={cn(
          'flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-accent/50',
          isOpen && 'text-primary bg-primary/10',
          areaCount > 0 && !isOpen && 'text-primary',
        )}
      >
        <Target className="h-3 w-3" /> Áreas de Gravação
        {areaCount > 0 && <Badge variant="secondary" className="h-3.5 min-w-[14px] px-1 text-[8px]">{areaCount}</Badge>}
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
    </CollapsibleTrigger>
  );
}

export function PrintAreasManager({ componentId }: { componentId: string; componentName: string }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PrintArea | null>(null);

  const { data: areas = [], isLoading, error } = useQuery(({
    queryKey: ['kit-print-areas', componentId],
    queryFn: () => fetchPrintAreas(componentId),
    enabled: !!componentId && isOpen,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    placeholderData: (prev) => prev,
  }));

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['kit-print-areas', componentId] });
  }, [queryClient, componentId]);

  const handleCreate = async (formData: PrintAreaFormData) => {
    setIsSaving(true);
    try {
      const areaName = [formData.location_name, formData.technique_name].filter(Boolean).join(' — ');
      await createPrintArea({
        kit_component_id: componentId,
        location_code: formData.location_code.trim() || null,
        location_name: formData.location_name.trim() || null,
        area_name: areaName || null,
        technique_name: formData.technique_name.trim() || null,
        technique_id: formData.technique_id.trim() || null,
        max_width_mm: formData.max_width_mm,
        max_height_mm: formData.max_height_mm,
        tabela_preco_id: formData.tabela_preco_id.trim() || null,
        display_order: formData.display_order,
        notes: formData.notes.trim() || null,
        is_active: true,
      });
      toast.success('Área de gravação criada');
      setIsCreating(false);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar área');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (areaId: string, formData: PrintAreaFormData) => {
    setIsSaving(true);
    try {
      const areaName = [formData.location_name, formData.technique_name].filter(Boolean).join(' — ');
      await updatePrintArea(areaId, {
        location_code: formData.location_code.trim() || null,
        location_name: formData.location_name.trim() || null,
        area_name: areaName || null,
        technique_name: formData.technique_name.trim() || null,
        technique_id: formData.technique_id.trim() || null,
        max_width_mm: formData.max_width_mm,
        max_height_mm: formData.max_height_mm,
        tabela_preco_id: formData.tabela_preco_id.trim() || null,
        display_order: formData.display_order,
        notes: formData.notes.trim() || null,
      });
      toast.success('Área atualizada');
      setEditingId(null);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deletePrintArea(deleteTarget.id);
      toast.success('Área removida');
      setDeleteTarget(null);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <PrintAreasTrigger areaCount={areas.length} isOpen={isOpen} />

        <CollapsibleContent>
          <PrintAreaList
            areas={areas}
            editingId={editingId}
            error={error}
            isCreating={isCreating}
            isLoading={isLoading}
            isSaving={isSaving}
            onCancelCreate={() => setIsCreating(false)}
            onCancelEdit={() => setEditingId(null)}
            onCreate={handleCreate}
            onDelete={setDeleteTarget}
            onEdit={(areaId) => { setEditingId(areaId); setIsCreating(false); }}
            onStartCreate={() => { setIsCreating(true); setEditingId(null); }}
            onUpdate={handleUpdate}
          />
        </CollapsibleContent>
      </Collapsible>

      {(<AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir área de gravação?</AlertDialogTitle>
            <AlertDialogDescription>
              A área <strong>{deleteTarget?.area_name || deleteTarget?.location_name}</strong> será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>)}
    </>
  );
}
