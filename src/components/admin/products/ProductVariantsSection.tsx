/**
 * ProductVariantsSection — CRUD de variações de cor de um produto
 * Refactored: logic in useProductVariants, form in VariantForm.
 */
import { Palette, Package, AlertCircle, Plus, Pencil, Trash2, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VariantGridMatrix } from '@/components/products/VariantGridMatrix';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useProductVariants } from './useProductVariants';
import { VariantForm } from './VariantForm';
import type { CSSProperties } from 'react';

interface ProductVariantsSectionProps {
  productId: string;
  productName?: string;
  productSku?: string;
}

function StockBadge({ stock }: { stock: number | null }) {
  const qty = stock ?? 0;
  if (qty === 0) return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Sem estoque</Badge>;
  if (qty < 100) return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{qty} un</Badge>;
  return <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] px-1.5 py-0">{qty >= 1000 ? `${(qty / 1000).toFixed(1)}k` : qty} un</Badge>;
}

function isLightColor(hex: string | null) {
  if (!hex) return true;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 186;
}

type VariantsModel = ReturnType<typeof useProductVariants>;
type ProductVariant = VariantsModel["variants"][number];

const textOrEmpty = (value: string | null): string => value ?? '';
const variantName = (variant: ProductVariant): string => variant.color_name || variant.name;

function VariantTooltipDetails({ variant, stockLabel }: { variant: ProductVariant; stockLabel: string }) {
  return <div className="flex flex-col gap-0.5"><span className="font-medium">{variantName(variant)}</span><span className="text-muted-foreground font-mono">{variant.sku}</span>{variant.size_code && <span className="text-muted-foreground">Tam: <strong>{variant.size_code}</strong></span>}{variant.capacity_ml && <span className="text-muted-foreground">{variant.capacity_ml}ml</span>}{variant.supplier_sku && <span className="text-muted-foreground font-mono text-[10px]">Forn: {variant.supplier_sku}</span>}{variant.ean && <span className="text-muted-foreground font-mono text-[10px]">EAN: {variant.ean}</span>}<span>{stockLabel} un</span></div>;
}

function swatchStyle(hex: string | null, transparent: boolean, selected: boolean): CSSProperties {
  const backgroundColor = transparent ? undefined : (hex ?? 'hsl(var(--muted))');
  if (!selected) return { backgroundColor };
  return { backgroundColor, borderColor: hex ?? 'hsl(var(--muted))', ['--tw-ring-color' as string]: hex ?? 'hsl(var(--primary))' };
}

function SwatchButton({ variant, model, transparent, selected, stock }: { variant: ProductVariant; model: VariantsModel; transparent: boolean; selected: boolean; stock: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button type="button" onClick={() => { model.setEditingId(variant.id); model.setIsCreating(false); }} className={cn('w-9 h-9 rounded-full border-2 transition-all duration-200 flex items-center justify-center hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2', selected ? 'ring-2 ring-offset-1' : 'border-border hover:border-muted-foreground/50', transparent && 'bg-gradient-to-br from-muted to-muted/60', stock === 0 && 'opacity-40')} style={swatchStyle(variant.color_hex, transparent, selected)}>
        {selected && <Check className={cn('w-4 h-4', isLightColor(variant.color_hex) ? 'text-foreground' : 'text-white')} />}
      </button>
      {variant.size_code && <span className="text-[9px] font-medium text-muted-foreground leading-none">{variant.size_code}</span>}
    </div>
  );
}

function VariantSwatch({ variant, model }: { variant: ProductVariant; model: VariantsModel }) {
  const hex = variant.color_hex;
  const isTransparent = !hex || hex.toLowerCase() === '#ffffff';
  const stock = variant.stock_quantity ?? 0;
  const stockLabel = stock >= 1000 ? `${(stock / 1000).toFixed(1)}k` : String(stock);
  const selected = model.editingId === variant.id;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <SwatchButton variant={variant} model={model} transparent={isTransparent} selected={selected} stock={stock} />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs"><VariantTooltipDetails variant={variant} stockLabel={stockLabel} /></TooltipContent>
    </Tooltip>
  );
}

function VariantSwatches({ model }: { model: VariantsModel }) {
  if (model.variants.length === 0) return null;
  return <TooltipProvider delayDuration={200}><div className="flex flex-wrap gap-2.5">{model.variants.map((variant) => <VariantSwatch key={variant.id} variant={variant} model={model} />)}</div></TooltipProvider>;
}

function VariantThumbnail({ variant }: { variant: ProductVariant }) {
  if (variant.selected_thumbnail) return <img src={variant.selected_thumbnail} alt={variantName(variant)} className="w-10 h-10 rounded-md object-cover border shrink-0" loading="lazy" />;
  if (variant.color_hex) return <div className="w-10 h-10 rounded-md border shrink-0" style={{ backgroundColor: variant.color_hex }} title={variant.color_name || ''} />;
  return <div className="w-10 h-10 rounded-md border shrink-0 bg-muted flex items-center justify-center"><Palette className="h-4 w-4 text-muted-foreground" /></div>;
}

function variantFormInitial(variant: ProductVariant) {
  return {
    name: textOrEmpty(variant.name), sku: textOrEmpty(variant.sku), color_name: textOrEmpty(variant.color_name),
    color_hex: variant.color_hex ?? '#000000', stock_quantity: variant.stock_quantity ?? 0,
    supplier_sku: textOrEmpty(variant.supplier_sku), ean: textOrEmpty(variant.ean), size_code: textOrEmpty(variant.size_code),
    capacity_ml: variant.capacity_ml, height_mm: variant.height_mm, width_mm: variant.width_mm,
    length_mm: variant.length_mm, weight_g: variant.weight_g,
  };
}

function VariantMetadata({ variant }: { variant: ProductVariant }) {
  return <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="font-mono">{variant.sku}</span>{variant.supplier_sku && <span className="font-mono">• {variant.supplier_sku}</span>}{variant.ean && <span className="font-mono">• EAN:{variant.ean}</span>}{variant.size_code && <span>• {variant.size_code}</span>}{variant.capacity_ml && <span>• {variant.capacity_ml}ml</span>}</div>;
}

function VariantListItem({ variant, model }: { variant: ProductVariant; model: VariantsModel }) {
  if (model.editingId === variant.id) {
    return <VariantForm initial={variantFormInitial(variant)} onSave={(data) => model.handleUpdate(variant.id, data)} onCancel={() => model.setEditingId(null)} isSaving={model.isSaving} />;
  }
  return (
    <div className={cn('flex items-center gap-2.5 rounded-lg border p-2 transition-colors group hover:bg-accent/50', !variant.stock_quantity && 'opacity-60')}>
      <VariantThumbnail variant={variant} />
      <div className="min-w-0 flex-1"><p className="text-xs font-medium truncate" title={variantName(variant)}>{variantName(variant)}</p><VariantMetadata variant={variant} /><StockBadge stock={variant.stock_quantity} /></div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"><Button type="button" variant="ghost" size="icon" aria-label="Editar" className="h-7 w-7" onClick={() => { model.setEditingId(variant.id); model.setIsCreating(false); }}><Pencil className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" aria-label="Excluir" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => model.setDeleteTarget(variant)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
    </div>
  );
}

function VariantsList({ model }: { model: VariantsModel }) {
  return <div className="space-y-2">{model.variants.map((variant) => <VariantListItem key={variant.id} variant={variant} model={model} />)}</div>;
}

function VariantsHeader({ model }: { model: VariantsModel }) {
  const totalStock = model.totalStock >= 1000 ? `${(model.totalStock / 1000).toFixed(1)}k` : model.totalStock.toLocaleString('pt-BR');
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">{model.variants.length > 0 ? <><span className="font-medium text-foreground">{model.variants.length} variações</span><span>•</span><span>Estoque total: <span className="font-medium text-foreground">{totalStock} un</span></span></> : <span className="flex items-center gap-2"><Package className="h-4 w-4" />Nenhuma variação cadastrada</span>}</div>
      {!model.isCreating && <Button type="button" variant="outline" size="sm" onClick={() => { model.setIsCreating(true); model.setEditingId(null); }}><Plus className="h-3.5 w-3.5 mr-1" /> Nova Variação</Button>}
    </div>
  );
}

function VariantsMatrix({ model }: { model: VariantsModel }) {
  if (!model.variants.some((variant) => variant.size_code)) return null;
  const variants = model.variants.map((variant) => ({ id: variant.id, color_name: variantName(variant), color_hex: variant.color_hex ?? '#888', size_code: variant.size_code, stock: variant.stock_quantity ?? 0, sku: variant.sku, image: variant.selected_thumbnail }));
  return <VariantGridMatrix variants={variants} selectedId={model.editingId} onSelect={(item) => { model.setEditingId(item.id); model.setIsCreating(false); }} mode="admin" compact onBulkAction={model.handleBulkAction} isBulkLoading={model.isBulkLoading} />;
}

export function ProductVariantsSection({ productId, productName, productSku }: ProductVariantsSectionProps) {
  const m = useProductVariants(productId, productName, productSku);

  if (m.isLoading) return <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>;
  if (m.error) return <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />Erro ao carregar variações</div>;

  return (
    <div className="space-y-3">
      {/* Header */}
      <VariantsHeader model={m} />

      {/* Swatches */}
      <VariantSwatches model={m} />

      {/* Grid matrix */}
      <VariantsMatrix model={m} />

      {/* Create form */}
      {(m.isCreating && <VariantForm initial={m.createInitial} onSave={m.handleCreate} onCancel={() => m.setIsCreating(false)} isSaving={m.isSaving} />)}

      {/* Variants list */}
      <VariantsList model={m} />

      {/* Delete dialog */}
      {(<AlertDialog open={!!m.deleteTarget} onOpenChange={open => !open && m.setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir variação?</AlertDialogTitle>
            <AlertDialogDescription>A variação <strong>{m.deleteTarget?.color_name || m.deleteTarget?.name}</strong> (SKU: {m.deleteTarget?.sku}) será desativada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={m.isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={m.handleDelete} disabled={m.isSaving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {m.isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>)}
    </div>
  );
}
