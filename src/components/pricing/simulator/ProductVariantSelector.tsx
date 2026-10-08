import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Palette, Check, Ruler } from 'lucide-react';

export interface ProductVariant {
  code: string;
  name: string;
  hex?: string;
  stock?: number;
  size_code?: string | null;
  sale_price?: number | null;
}

interface ProductVariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelect: (variant: ProductVariant | null) => void;
  label?: string;
}

// Smart size ordering
const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', '2XG', '3XG', 'EG', 'EGG'];
function sizeSort(a: string, b: string): number {
  const ia = SIZE_ORDER.indexOf(a.toUpperCase());
  const ib = SIZE_ORDER.indexOf(b.toUpperCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b, 'pt-BR');
}

function groupVariants(variants: ProductVariant[], enabled: boolean) {
  if (!enabled) return null;
  const groups = new Map<string, ProductVariant[]>();
  for (const variant of variants) {
    const key = variant.name.length > 0 ? variant.name : 'Padrão';
    const group = groups.get(key) ?? [];
    group.push(variant);
    groups.set(key, group);
  }
  for (const group of groups.values()) group.sort((a, b) => sizeSort(a.size_code ?? '', b.size_code ?? ''));
  return groups;
}

function SizeChip({ variant, selected, onSelect }: { variant: ProductVariant; selected: boolean; onSelect: (variant: ProductVariant | null) => void }) {
  const outOfStock = (variant.stock ?? 1) === 0;
  return <button onClick={() => onSelect(selected ? null : variant)} disabled={outOfStock} className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all', selected ? 'border-primary bg-primary/15 text-primary ring-1 ring-primary/30' : 'border-border bg-card hover:border-primary/50 hover:bg-accent text-foreground', outOfStock ? 'opacity-40 cursor-not-allowed' : undefined)}><Ruler className="h-3 w-3" />{variant.size_code ?? '—'}{selected ? <Check className="h-3 w-3" /> : null}</button>;
}

function ColorGroup({ colorName, variants, selectedVariant, onSelect }: { colorName: string; variants: ProductVariant[]; selectedVariant: ProductVariant | null; onSelect: (variant: ProductVariant | null) => void }) {
  const selected = variants.some((variant) => selectedVariant?.code === variant.code);
  return <div className={cn('rounded-lg border p-3 space-y-2 transition-colors', selected ? 'border-primary/40 bg-primary/5' : 'border-border')}><div className="flex items-center gap-2"><div className={cn('w-5 h-5 rounded-full border-2 shrink-0', selected ? 'border-primary' : 'border-muted-foreground/30')} style={{ backgroundColor: variants[0]?.hex ?? '#888' }} /><span className="text-sm font-medium">{colorName}</span></div><div className="flex flex-wrap gap-1.5 pl-7">{variants.map((variant) => <SizeChip key={variant.code} variant={variant} selected={selectedVariant?.code === variant.code} onSelect={onSelect} />)}</div></div>;
}

function FlatVariant({ variant, selected, onSelect }: { variant: ProductVariant; selected: boolean; onSelect: (variant: ProductVariant | null) => void }) {
  const outOfStock = (variant.stock ?? 1) === 0;
  return <button onClick={() => onSelect(selected ? null : variant)} disabled={outOfStock} className={cn('group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all', selected ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-border bg-card hover:border-primary/50 hover:bg-accent', outOfStock ? 'opacity-50 cursor-not-allowed' : undefined)}><div className={cn('w-5 h-5 rounded-full border-2 transition-all', selected ? 'border-primary' : 'border-muted-foreground/30')} style={{ backgroundColor: variant.hex ?? '#888' }}>{selected ? <Check className="w-3 h-3 text-primary-foreground absolute top-1/2 left-[14px] -translate-y-1/2" /> : null}</div><span className="text-sm font-medium">{variant.name}</span>{outOfStock ? <Badge variant="secondary" className="text-xs px-1.5 py-0">Sem estoque</Badge> : null}</button>;
}

function SelectionSummary({ variant }: { variant: ProductVariant | null }) {
  if (!variant) return null;
  const hasStock = variant.stock !== undefined && variant.stock > 0;
  return <p className="text-xs text-muted-foreground">Selecionado: <strong>{variant.name}</strong>{variant.size_code ? <span className="ml-1">— Tamanho: <strong>{variant.size_code}</strong></span> : null}{hasStock ? <span className="ml-2 text-success">({variant.stock} em estoque)</span> : null}</p>;
}

export function ProductVariantSelector({
  variants,
  selectedVariant,
  onSelect,
  label = 'Cor do Produto',
}: ProductVariantSelectorProps) {
  // Detect if any variant has size_code
  const hasSizes = useMemo(() => variants.some(v => v.size_code), [variants]);

  // Group by color when sizes exist
  const grouped = useMemo(() => groupVariants(variants, hasSizes), [variants, hasSizes]);

  const sortedVariants = useMemo(() => {
    if (hasSizes) return variants; // grouped view handles display
    return [...variants].sort((a, b) => {
      const aStock = a.stock ?? 0;
      const bStock = b.stock ?? 0;
      if (aStock > 0 && bStock === 0) return -1;
      if (aStock === 0 && bStock > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [variants, hasSizes]);

  if (variants.length === 0) return null;

  // Single variant — just show info
  if (variants.length === 1 && !hasSizes) {
    const variant = variants[0];
    if (!variant) return null;
    return (
      <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
        <div
          className="w-6 h-6 rounded-full border-2 border-border"
          style={{ backgroundColor: variant.hex ?? '#888' }}
        />
        <span className="text-sm">
          Cor: <strong>{variant.name}</strong>
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-sm font-medium flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          {label}
        </label>
      )}

      {/* ── Grouped by color with size chips ── */}
      {hasSizes && grouped ? (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([colorName, group]) => <ColorGroup key={colorName} colorName={colorName} variants={group} selectedVariant={selectedVariant} onSelect={onSelect} />)}
        </div>
      ) : (
        /* ── Flat color list (no sizes) ── */
        <div className="flex flex-wrap gap-2">
          {sortedVariants.map((variant) => <FlatVariant key={variant.code} variant={variant} selected={selectedVariant?.code === variant.code} onSelect={onSelect} />)}
        </div>
      )}

      {/* Selection summary */}
      <SelectionSummary variant={selectedVariant} />
    </div>
  );
}
