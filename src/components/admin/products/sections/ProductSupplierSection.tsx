/**
 * Unified Supplier section — primary supplier + alternative sources in one card
 */
import { isNullish } from "@/components/admin/utils/nullish";
import { useState, type Dispatch, type SetStateAction } from 'react';
import { SupplierSelect } from '../SupplierSelect';
import { NewSupplierDialog } from '../NewSupplierDialog';
import { type FormSectionProps } from "../ProductFormHelpers";
import { SupplierFiscalInfo } from '../SupplierFiscalInfo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Truck, Plus, Star, Trash2, Clock, DollarSign, Loader2, Users } from 'lucide-react';
import { useProductSupplierSources, type SupplierSource, type SupplierSourceInput } from '@/hooks/useProductSupplierSources';
import { cn } from '@/lib/utils';

interface Props extends Pick<FormSectionProps, 'setValue' | 'errors'> {
  supplierId: string;
  onSupplierChange: (id: string, name?: string, markup?: number | null) => void;
  productId?: string;
  isEdit: boolean;
  primarySupplierName: string;
}

const emptyForm = {
  supplier_id: '',
  supplier_name: '',
  supplier_sku: '',
  cost_price: 0,
  sale_price: 0,
  lead_time_days: null as number | null,
  stock_quantity: 0,
  min_order_quantity: 1,
  notes: '',
};

type DisplaySource = SupplierSource & { _localId: string; _persisted: boolean };
type SupplierFormState = typeof emptyForm;

function numericInputValue(value: number): number | '' {
  return value || '';
}

function parseFloatOr(value: string, fallback: number): number {
  return parseFloat(value) || fallback;
}

function parseIntOr(value: string, fallback: number): number {
  return parseInt(value) || fallback;
}

function parseNullableInt(value: string): number | null {
  return value ? parseInt(value) : null;
}

function formatCurrency(value: number | null): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function SourceBadges({ source, persisted }: { source: DisplaySource; persisted: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-sm font-medium truncate">{source.supplier_name}</span>
      {source.is_preferred && <Badge className="text-[10px] bg-primary/20 text-primary border-0"><Star className="h-3 w-3 mr-0.5 fill-current" /> Preferencial</Badge>}
      {!persisted && <Badge variant="outline" className="text-[10px] text-warning border-warning/30">Pendente</Badge>}
      {!source.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inativo</Badge>}
    </div>
  );
}

interface SourceActionsProps {
  source: DisplaySource;
  persisted: boolean;
  onPrefer: (id: string) => void;
  onRemove: (id: string) => void;
  onRemovePending: (id: string) => void;
}

function SourceActions({ source, persisted, onPrefer, onRemove, onRemovePending }: SourceActionsProps) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {persisted && !source.is_preferred && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Favoritar" className="h-7 w-7" onClick={() => onPrefer(source.id)}><Star className="h-3.5 w-3.5" /></Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Definir como preferencial</TooltipContent>
        </Tooltip>
      )}
      {persisted ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover fonte?</AlertDialogTitle>
              <AlertDialogDescription>O fornecedor "{source.supplier_name}" será desvinculado deste produto.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onRemove(source.id)}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button variant="ghost" size="icon" aria-label="Excluir" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => onRemovePending(source.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

interface SourceCardProps extends Omit<SourceActionsProps, 'persisted'> {
  productId?: string;
}

function SupplierSourceCard({ source, productId, onPrefer, onRemove, onRemovePending }: SourceCardProps) {
  const persisted = source._persisted;
  return (
    <Card className={cn('p-3 transition-colors border-border/50 bg-card/50', source.is_preferred && 'border-primary/30 bg-primary/5')}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <SourceBadges source={source} persisted={persisted} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {source.supplier_sku && <span className="font-mono">SKU: {source.supplier_sku}</span>}
            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />Custo: {formatCurrency(source.cost_price)} · Venda: {formatCurrency(source.sale_price)}</span>
            {!isNullish(source.lead_time_days) && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {source.lead_time_days}d</span>}
            <span>Estoque: {source.stock_quantity}</span>
          </div>
          {persisted && <SupplierFiscalInfo productId={productId} supplierId={source.supplier_id} />}
        </div>
        <SourceActions source={source} persisted={persisted} onPrefer={onPrefer} onRemove={onRemove} onRemovePending={onRemovePending} />
      </div>
    </Card>
  );
}

function SupplierSourcesList({
  sources,
  isLoading,
  productId,
  onPrefer,
  onRemove,
  onRemovePending,
}: {
  sources: DisplaySource[];
  isLoading: boolean;
  productId?: string;
  onPrefer: (id: string) => void;
  onRemove: (id: string) => void;
  onRemovePending: (id: string) => void;
}) {
  if (isLoading) return <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (sources.length === 0) return null;
  return (
    <div className="space-y-2 mb-3">
      {sources.map((source) => (
        <SupplierSourceCard key={source.id} source={source} productId={productId} onPrefer={onPrefer} onRemove={onRemove} onRemovePending={onRemovePending} />
      ))}
    </div>
  );
}

interface AlternativeSupplierDialogProps {
  form: SupplierFormState;
  open: boolean;
  saving: boolean;
  onAdd: () => void;
  onOpenChange: (open: boolean) => void;
  setForm: Dispatch<SetStateAction<SupplierFormState>>;
}

function SupplierPriceFields({ form, setForm }: Pick<AlternativeSupplierDialogProps, 'form' | 'setForm'>) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-medium mb-1 block">Preço de Custo</label>
        <Input type="number" min="0" step="0.01" value={numericInputValue(form.cost_price)} onChange={(event) => setForm((current) => ({ ...current, cost_price: parseFloatOr(event.target.value, 0) }))} className="h-9" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Preço de Venda</label>
        <Input type="number" min="0" step="0.01" value={numericInputValue(form.sale_price)} onChange={(event) => setForm((current) => ({ ...current, sale_price: parseFloatOr(event.target.value, 0) }))} className="h-9" />
      </div>
    </div>
  );
}

function AlternativeSupplierDialog({ form, open, saving, onAdd, onOpenChange, setForm }: AlternativeSupplierDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-1.5" /> Adicionar Fornecedor Alternativo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova Fonte de Fornecimento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Fornecedor</label>
            <SupplierSelect value={form.supplier_id} onChange={(id, name) => setForm((current) => ({ ...current, supplier_id: id, supplier_name: name || '' }))} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">SKU do Fornecedor</label>
            <Input value={form.supplier_sku} onChange={(event) => setForm((current) => ({ ...current, supplier_sku: event.target.value }))} placeholder="Código ref. do fornecedor" className="h-9 font-mono" />
          </div>
          <SupplierPriceFields form={form} setForm={setForm} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Prazo (dias)</label>
              <Input type="number" min="0" value={form.lead_time_days ?? ''} onChange={(event) => setForm((current) => ({ ...current, lead_time_days: parseNullableInt(event.target.value) }))} className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Estoque</label>
              <Input type="number" min="0" value={numericInputValue(form.stock_quantity)} onChange={(event) => setForm((current) => ({ ...current, stock_quantity: parseIntOr(event.target.value, 0) }))} className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Qtd Mín.</label>
              <Input type="number" min="1" value={numericInputValue(form.min_order_quantity)} onChange={(event) => setForm((current) => ({ ...current, min_order_quantity: parseIntOr(event.target.value, 1) }))} className="h-9" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onAdd} disabled={!form.supplier_id || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductSupplierSection({
  supplierId, onSupplierChange, setValue, errors,
  productId,
}: Props) {
  const { sources, isLoading, addSource, removeSource, setPreferred } = useProductSupplierSources(productId);
  const [pendingSources, setPendingSources] = useState<Array<SupplierSourceInput & { _localId: string }>>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Combine persisted + pending sources for display
  const allSources: DisplaySource[] = [
    ...sources.map(s => ({ ...s, _localId: s.id, _persisted: true as const })),
    ...pendingSources.map(s => ({ ...s, id: s._localId, created_at: '', updated_at: '', _persisted: false as const })),
  ];

  const handleAdd = async () => {
    if (!form.supplier_id) return;

    if (productId) {
      // Persisted mode
      setSaving(true);
      const input: SupplierSourceInput = {
        product_id: productId,
        supplier_id: form.supplier_id,
        supplier_name: form.supplier_name,
        supplier_sku: form.supplier_sku || null,
        cost_price: form.cost_price,
        sale_price: form.sale_price,
        lead_time_days: form.lead_time_days,
        stock_quantity: form.stock_quantity,
        min_order_quantity: form.min_order_quantity,
        is_preferred: sources.length === 0,
        is_active: true,
        notes: form.notes || null,
      };
      const ok = await addSource(input);
      setSaving(false);
      if (ok) {
        setForm(emptyForm);
        setDialogOpen(false);
      }
    } else {
      // Local-only mode (product not yet saved)
      const localEntry: SupplierSourceInput & { _localId: string } = {
        _localId: crypto.randomUUID(),
        product_id: '',
        supplier_id: form.supplier_id,
        supplier_name: form.supplier_name,
        supplier_sku: form.supplier_sku || null,
        cost_price: form.cost_price,
        sale_price: form.sale_price,
        lead_time_days: form.lead_time_days,
        stock_quantity: form.stock_quantity,
        min_order_quantity: form.min_order_quantity,
        is_preferred: pendingSources.length === 0 && sources.length === 0,
        is_active: true,
        notes: form.notes || null,
      };
      setPendingSources(prev => [...prev, localEntry]);
      setForm(emptyForm);
      setDialogOpen(false);
    }
  };

  const removePending = (localId: string) => {
    setPendingSources(prev => prev.filter(s => s._localId !== localId));
  };

  return (
    <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden">
      <div className="p-4 space-y-4">
        {/* ── Fornecedor Principal ── */}
        {(<div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Truck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">Fornecedor Principal</h3>
              <p className="text-[11px] text-muted-foreground">Selecione ou cadastre o fornecedor do produto</p>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <SupplierSelect
                value={supplierId}
                onChange={onSupplierChange}
                error={errors.supplier_id?.message}
              />
            </div>
            <NewSupplierDialog onCreated={(id) => setValue('supplier_id', id)} />
          </div>
          {/* Primary supplier fiscal info */}
          {supplierId && productId && (
            <SupplierFiscalInfo productId={productId} supplierId={supplierId} />
          )}
        </div>)}

        {/* ── Separator ── */}
        <Separator className="bg-border/50" />

        {/* ── Fornecedores Secundários ── */}
        <div>
          {(<div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-sm font-semibold text-foreground">Fornecedores Secundários</h3>
              <p className="text-[11px] text-muted-foreground">Fontes alternativas com preços e prazos distintos</p>
            </div>
            <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
              {allSources.length} fonte{allSources.length !== 1 ? 's' : ''}
            </Badge>
          </div>)}

          <SupplierSourcesList
            sources={allSources}
            isLoading={isLoading}
            productId={productId}
            onPrefer={(id) => { void setPreferred(id); }}
            onRemove={(id) => { void removeSource(id); }}
            onRemovePending={removePending}
          />

          {!isLoading && (
            <AlternativeSupplierDialog
              form={form}
              open={dialogOpen}
              saving={saving}
              onAdd={() => { void handleAdd(); }}
              onOpenChange={setDialogOpen}
              setForm={setForm}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
