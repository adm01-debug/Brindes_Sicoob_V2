/**
 * ProductKitComponentsSection — Orchestrator
 * Sub-components: ComponentForm, PrintAreasManager, VolumeValidation
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Pencil, Trash2, Loader2, AlertCircle, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { ComponentForm } from './ComponentForm';
import { ComponentMediaManager } from './ComponentMediaManager';
import { PrintAreasManager } from './PrintAreasManager';
import { VolumeValidation } from './VolumeValidation';
import { fetchKitComponents, fetchPrintAreas, createComponent, updateComponent, deleteComponent } from './api';
import { type KitComponent, type ComponentFormData, type BoxInternalDimensions, EMPTY_FORM } from "./types";

interface ProductKitComponentsSectionProps {
  productId: string;
  boxInternalDimensions?: BoxInternalDimensions;
}

function nullableTrim(value: string): string | null {
  return value.trim() || null;
}

function formText(value: string | null | undefined): string {
  return value || '';
}

function formNumber(value: number | null | undefined, fallback: number): number {
  return value ?? fallback;
}

function formBoolean(value: boolean | null | undefined, fallback: boolean): boolean {
  return value ?? fallback;
}

function componentPayload(formData: ComponentFormData) {
  return {
    component_name: formData.component_name.trim(),
    component_type_code: nullableTrim(formData.component_type_code),
    component_code: nullableTrim(formData.component_code),
    component_sku: nullableTrim(formData.component_sku),
    supplier_component_code: nullableTrim(formData.supplier_component_code),
    component_description: nullableTrim(formData.component_description),
    quantity: formData.quantity,
    display_order: formData.display_order,
    material: nullableTrim(formData.material),
    color: nullableTrim(formData.color),
    height_mm: formData.height_mm,
    width_mm: formData.width_mm,
    length_mm: formData.length_mm,
    weight_g: formData.weight_g,
    is_optional: formData.is_optional,
    is_packaging: formData.is_packaging,
    is_replaceable: formData.is_replaceable,
    allows_personalization: formData.allows_personalization,
    personalization_notes: nullableTrim(formData.personalization_notes),
    primary_image_url: nullableTrim(formData.primary_image_url),
    notes: nullableTrim(formData.notes),
  };
}

function componentFormData(component: KitComponent): ComponentFormData {
  return {
    component_name: formText(component.component_name),
    component_type_code: formText(component.component_type_code),
    component_code: formText(component.component_code),
    component_sku: formText(component.component_sku),
    supplier_component_code: formText(component.supplier_component_code),
    component_description: formText(component.component_description),
    quantity: formNumber(component.quantity, 1),
    display_order: formNumber(component.display_order, 0),
    material: formText(component.material),
    color: formText(component.color),
    height_mm: component.height_mm,
    width_mm: component.width_mm,
    length_mm: component.length_mm,
    weight_g: component.weight_g,
    is_optional: formBoolean(component.is_optional, false),
    is_packaging: formBoolean(component.is_packaging, false),
    is_replaceable: formBoolean(component.is_replaceable, false),
    allows_personalization: formBoolean(component.allows_personalization, true),
    personalization_notes: formText(component.personalization_notes),
    primary_image_url: formText(component.primary_image_url),
    notes: formText(component.notes),
  };
}

function ComponentFlags({ component }: { component: KitComponent }) {
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {component.is_optional && <Badge variant="outline" className="text-[9px] px-1 py-0">Opcional</Badge>}
      {component.is_packaging && <Badge variant="outline" className="text-[9px] px-1 py-0">Embalagem</Badge>}
      {component.allows_personalization && <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] px-1 py-0">Personalizável</Badge>}
    </div>
  );
}

function ComponentDisplay({ component, productId, onDelete, onEdit }: { component: KitComponent; productId: string; onDelete: (component: KitComponent) => void; onEdit: (id: string) => void }) {
  return (
    <div className="space-y-0.5">
      <div className={cn('flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors group', 'hover:bg-accent/50')}>
        {component.primary_image_url ? <img src={component.primary_image_url} alt={formText(component.component_name)} className="w-10 h-10 rounded-md object-contain border shrink-0 bg-muted/30" loading="lazy" /> : <div className="w-10 h-10 rounded-md border shrink-0 bg-muted flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5"><p className="text-xs font-medium truncate">{component.component_name || 'Sem nome'}</p>{component.component_type_code && <Badge variant="secondary" className="text-[9px] px-1 py-0 uppercase">{component.component_type_code}</Badge>}</div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {component.component_sku && <span className="font-mono">{component.component_sku}</span>}<span>Qtd: {component.quantity ?? 1}</span>{component.material && <span>• {component.material}</span>}{component.color && <span>• {component.color}</span>}
          </div>
          <ComponentFlags component={component} />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button type="button" variant="ghost" size="icon" aria-label="Editar" className="h-7 w-7" onClick={() => onEdit(component.id)}><Pencil className="h-3 w-3" /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Excluir" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(component)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
      {component.allows_personalization && <PrintAreasManager componentId={component.id} componentName={formText(component.component_name)} />}
      <ComponentMediaManager componentId={component.id} productId={productId} componentName={formText(component.component_name)} />
    </div>
  );
}

function KitComponentRow({ component, productId, editing, isSaving, onCancelEdit, onDelete, onEdit, onUpdate }: { component: KitComponent; productId: string; editing: boolean; isSaving: boolean; onCancelEdit: () => void; onDelete: (component: KitComponent) => void; onEdit: (id: string) => void; onUpdate: (id: string, data: ComponentFormData) => void }) {
  if (editing) return <ComponentForm initial={componentFormData(component)} onSave={(data) => onUpdate(component.id, data)} onCancel={onCancelEdit} isSaving={isSaving} />;
  return <ComponentDisplay component={component} productId={productId} onDelete={onDelete} onEdit={onEdit} />;
}

function KitSummary({ components, isCreating, onCreate }: { components: KitComponent[]; isCreating: boolean; onCreate: () => void }) {
  const itemTotal = components.reduce((sum, component) => sum + formNumber(component.quantity, 1), 0);
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {components.length > 0 ? <><span className="font-medium text-foreground">{components.length} componentes</span><span>•</span><span>Total itens: <span className="font-medium text-foreground">{itemTotal}</span></span></> : <span className="flex items-center gap-2"><Boxes className="h-4 w-4" /> Nenhum componente cadastrado</span>}
      </div>
      {!isCreating && <Button type="button" variant="outline" size="sm" onClick={onCreate}><Plus className="h-3.5 w-3.5 mr-1" /> Novo Componente</Button>}
    </div>
  );
}

export function ProductKitComponentsSection({ productId, boxInternalDimensions }: ProductKitComponentsSectionProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KitComponent | null>(null);

  const { data: components = [], isLoading, error } = useQuery({
    queryKey: ['kit-components', productId],
    queryFn: () => fetchKitComponents(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const prefetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    components
      .filter(c => c.allows_personalization && !prefetchedRef.current.has(c.id))
      .forEach(c => {
        prefetchedRef.current.add(c.id);
        queryClient.prefetchQuery({
          queryKey: ['kit-print-areas', c.id],
          queryFn: () => fetchPrintAreas(c.id),
          staleTime: 5 * 60 * 1000,
        });
      });
  }, [components, queryClient]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['kit-components', productId] });
  }, [queryClient, productId]);

  const handleCreate = async (formData: ComponentFormData) => {
    setIsSaving(true);
    try {
      await createComponent({ kit_product_id: productId, ...componentPayload(formData) });
      toast.success('Componente criado com sucesso');
      setIsCreating(false);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar componente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (compId: string, formData: ComponentFormData) => {
    setIsSaving(true);
    try {
      await updateComponent(compId, componentPayload(formData));
      toast.success('Componente atualizado');
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
      await deleteComponent(deleteTarget.id);
      toast.success('Componente removido');
      setDeleteTarget(null);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" /> Erro ao carregar componentes do kit
      </div>
    );
  }

  return (
    (<div className="space-y-3">
      <KitSummary components={components} isCreating={isCreating} onCreate={() => { setIsCreating(true); setEditingId(null); }} />

      {components.length > 0 && <VolumeValidation components={components} boxDimensions={boxInternalDimensions} />}

      {isCreating && (
        <ComponentForm initial={{ ...EMPTY_FORM, display_order: components.length }} onSave={handleCreate} onCancel={() => setIsCreating(false)} isSaving={isSaving} />
      )}

      <ScrollArea className={components.length > 5 ? 'h-[500px]' : ''}>
        <div className="space-y-2">
          {components.map((component) => (
            <KitComponentRow
              key={component.id}
              component={component}
              productId={productId}
              editing={editingId === component.id}
              isSaving={isSaving}
              onCancelEdit={() => setEditingId(null)}
              onDelete={setDeleteTarget}
              onEdit={(id) => { setEditingId(id); setIsCreating(false); }}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      </ScrollArea>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir componente?</AlertDialogTitle>
            <AlertDialogDescription>
              O componente <strong>{deleteTarget?.component_name}</strong> e suas áreas de gravação serão removidos permanentemente.
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
      </AlertDialog>
    </div>)
  );
}
