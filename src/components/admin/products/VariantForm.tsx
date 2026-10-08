/**
 * VariantForm — Inline form for creating/editing a product variant.
 * Extracted from ProductVariantsSection.tsx.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { VariantFormData } from './useProductVariants';

interface VariantFormProps {
  initial: VariantFormData;
  onSave: (data: VariantFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}

type SetVariantField = <K extends keyof VariantFormData>(field: K, value: VariantFormData[K]) => void;

function hasExtraVariantData(form: VariantFormData): boolean {
  return [form.supplier_sku, form.ean, form.size_code, form.capacity_ml, form.height_mm, form.width_mm, form.length_mm, form.weight_g].some(Boolean);
}

function numberInputValue(value: number | null | undefined): number | '' {
  return value ?? '';
}

function BasicVariantFields({ form, set }: { form: VariantFormData; set: SetVariantField }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-1"><Label className="text-xs">Cor</Label><Input value={form.color_name} onChange={event => set('color_name', event.target.value)} placeholder="Ex: Azul Royal" className="h-8 text-sm" /></div>
      <div className="space-y-1"><Label className="text-xs">Cor (hex)</Label><div className="flex items-center gap-2"><input type="color" value={form.color_hex || '#000000'} onChange={event => set('color_hex', event.target.value)} className="w-8 h-8 rounded border border-input bg-background cursor-pointer" /><Input value={form.color_hex} onChange={event => set('color_hex', event.target.value)} placeholder="#0000FF" className="h-8 text-sm font-mono flex-1" /></div></div>
      <div className="space-y-1"><Label className="text-xs">Estoque</Label><Input type="number" value={form.stock_quantity} onChange={event => set('stock_quantity', parseInt(event.target.value, 10) || 0)} min="0" className="h-8 text-sm" /></div>
    </div>
  );
}

function ExtraVariantFields({ form, set, showExtra, setShowExtra }: { form: VariantFormData; set: SetVariantField; showExtra: boolean; setShowExtra: (show: boolean) => void }) {
  const hasExtra = hasExtraVariantData(form);
  const expanded = showExtra || hasExtra;
  return (
    <Collapsible open={expanded} onOpenChange={setShowExtra}>
      <CollapsibleTrigger className="text-xs text-primary hover:underline flex items-center gap-1">{expanded ? '▾ Ocultar detalhes' : '▸ Mais detalhes (SKU fornecedor, EAN, dimensões...)'}</CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><Label className="text-xs">SKU Fornecedor</Label><Input value={form.supplier_sku} onChange={event => set('supplier_sku', event.target.value)} placeholder="SKU do fornecedor" className="h-8 text-sm font-mono" /></div>
          <div className="space-y-1"><Label className="text-xs">EAN</Label><Input value={form.ean} onChange={event => set('ean', event.target.value)} placeholder="Código de barras" className="h-8 text-sm font-mono" /></div>
          <div className="space-y-1"><Label className="text-xs">Tamanho</Label><Input value={form.size_code} onChange={event => set('size_code', event.target.value)} placeholder="Ex: P, M, G, GG" className="h-8 text-sm" /></div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="space-y-1"><Label className="text-xs">Capacidade (ml)</Label><Input type="number" value={numberInputValue(form.capacity_ml)} onChange={event => set('capacity_ml', event.target.value ? parseFloat(event.target.value) : null)} className="h-8 text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">Altura (mm)</Label><Input type="number" value={numberInputValue(form.height_mm)} onChange={event => set('height_mm', event.target.value ? parseFloat(event.target.value) : null)} className="h-8 text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">Largura (mm)</Label><Input type="number" value={numberInputValue(form.width_mm)} onChange={event => set('width_mm', event.target.value ? parseFloat(event.target.value) : null)} className="h-8 text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">Comp. (mm)</Label><Input type="number" value={numberInputValue(form.length_mm)} onChange={event => set('length_mm', event.target.value ? parseFloat(event.target.value) : null)} className="h-8 text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">Peso (g)</Label><Input type="number" value={numberInputValue(form.weight_g)} onChange={event => set('weight_g', event.target.value ? parseFloat(event.target.value) : null)} className="h-8 text-sm" /></div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function VariantForm({ initial, onSave, onCancel, isSaving }: VariantFormProps) {
  const [form, setForm] = useState<VariantFormData>(initial);
  const [showExtra, setShowExtra] = useState(false);

  const set = <K extends keyof VariantFormData>(field: K, value: VariantFormData[K]) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    if (!form.name.trim() || !form.sku.trim()) { toast.error('Nome e SKU são obrigatórios'); return; }
    onSave(form);
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-accent/30 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nome *</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Squeeze Azul" className="h-8 text-sm" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSave())} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">SKU *</Label>
          <Input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Ex: SQ-001-AZ" className="h-8 text-sm font-mono" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSave())} />
        </div>
      </div>

      <BasicVariantFields form={form} set={set} />
      <ExtraVariantFields form={form} set={set} showExtra={showExtra} setShowExtra={setShowExtra} />

      {(<div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}><X className="h-3.5 w-3.5 mr-1" /> Cancelar</Button>
        <Button type="button" size="sm" disabled={isSaving} onClick={handleSave}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}Salvar
        </Button>
      </div>)}
    </div>
  );
}
