/**
 * KitIsometricPreview — visualização 2.5D isométrica da caixa com itens
 * empilhados em proporção real. Indicador semântico de capacidade.
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KitState } from '@/lib/kit-builder/types';

interface KitIsometricPreviewProps {
  kitState: KitState;
  className?: string;
}

interface PlacedItem {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  d: number;
}

// Paleta semântica determinística por id
const PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--accent))',
  'hsl(220 70% 60%)',
  'hsl(280 60% 60%)',
  'hsl(160 60% 50%)',
  'hsl(30 80% 60%)',
];

function colorFor(id: string, idx: number): string {
  return PALETTE[idx % PALETTE.length] ?? PALETTE[0] ?? 'hsl(var(--primary))';
}

// Bin packing 3D simplificado (shelf packing por camadas Y)
function packItems(
  boxW: number,
  boxH: number,
  boxD: number,
  items: { id: string; name: string; w: number; h: number; d: number; quantity: number }[]
): PlacedItem[] {
  const placed: PlacedItem[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let cursorZ = 0;
  let rowDepth = 0;
  let layerHeight = 0;
  let itemIdx = 0;

  for (const item of items) {
    const color = colorFor(item.id, itemIdx++);
    for (let q = 0; q < item.quantity; q++) {
      // Linha cheia? Avança em Z
      if (cursorX + item.w > boxW) {
        cursorX = 0;
        cursorZ += rowDepth;
        rowDepth = 0;
      }
      // Camada cheia? Sobe em Y
      if (cursorZ + item.d > boxD) {
        cursorZ = 0;
        cursorY += layerHeight;
        layerHeight = 0;
      }
      // Caixa cheia? Para
      if (cursorY + item.h > boxH) return placed;

      placed.push({
        id: `${item.id}-${q}`,
        name: item.name,
        color,
        x: cursorX,
        y: cursorY,
        w: item.w,
        h: item.h,
        d: item.d,
      });
      cursorX += item.w;
      rowDepth = Math.max(rowDepth, item.d);
      layerHeight = Math.max(layerHeight, item.h);
    }
  }
  return placed;
}

// Projeção isométrica 2.5D
function iso(x: number, y: number, z: number): { px: number; py: number } {
  const angle = Math.PI / 6; // 30°
  return {
    px: (x - z) * Math.cos(angle),
    py: (x + z) * Math.sin(angle) - y,
  };
}

type KitBox = NonNullable<KitState['box']>;

function facePath(points: { px: number; py: number }[], tx: number, ty: number): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${(point.px + tx).toFixed(1)},${(point.py + ty).toFixed(1)}`).join(' ') + ' Z';
}

function buildPreviewLayout(box: KitBox, items: KitState['items']) {
  const placed = packItems(box.internalWidth, box.internalHeight, box.internalDepth, items.map(item => ({ id: item.id, name: item.name, w: Math.max(item.width, 1), h: Math.max(item.height, 1), d: Math.max(item.depth, 1), quantity: item.quantity })));
  const sorted = [...placed].sort((a, b) => a.y - b.y || (b.x + b.d) - (a.x + a.d));
  const totalRequested = items.reduce((sum, item) => sum + item.quantity, 0);
  return { sorted, totalRequested };
}

function buildProjection(box: KitBox) {
  const { internalWidth: width, internalHeight: height, internalDepth: depth } = box;
  const corners = [iso(0, 0, 0), iso(width, 0, 0), iso(width, 0, depth), iso(0, 0, depth), iso(0, height, 0), iso(width, height, 0), iso(width, height, depth), iso(0, height, depth)];
  const corner = (index: number) => corners[index] ?? { px: 0, py: 0 };
  const xs = corners.map(point => point.px);
  const ys = corners.map(point => point.py);
  const pad = 12;
  const tx = -Math.min(...xs) + pad;
  const ty = -Math.min(...ys) + pad;
  return { corners, corner, tx, ty, viewBoxWidth: Math.max(...xs) - Math.min(...xs) + pad * 2, viewBoxHeight: Math.max(...ys) - Math.min(...ys) + pad * 2 };
}

function capacityStatus(percentage: number): { color: string; label: string } {
  if (percentage > 100) return { color: 'destructive', label: 'Excedido' };
  if (percentage > 85) return { color: 'warning', label: 'Quase cheio' };
  if (percentage > 50) return { color: 'primary', label: 'Bom uso' };
  return { color: 'muted', label: 'Sobra espaço' };
}

function PreviewItem({ item, tx, ty }: { item: PlacedItem; tx: number; ty: number }) {
  const c100 = iso(item.x + item.w, item.y, 0);
  const c101 = iso(item.x + item.w, item.y, item.d);
  const c001 = iso(item.x, item.y, item.d);
  const c010 = iso(item.x, item.y + item.h, 0);
  const c110 = iso(item.x + item.w, item.y + item.h, 0);
  const c111 = iso(item.x + item.w, item.y + item.h, item.d);
  const c011 = iso(item.x, item.y + item.h, item.d);
  return <g><title>{item.name}</title><path d={facePath([c110, c100, c101, c111], tx, ty)} fill={item.color} fillOpacity="0.65" stroke="hsl(var(--background))" strokeWidth="0.6" /><path d={facePath([c011, c111, c101, c001], tx, ty)} fill={item.color} fillOpacity="0.85" stroke="hsl(var(--background))" strokeWidth="0.6" /><path d={facePath([c010, c110, c111, c011], tx, ty)} fill={item.color} fillOpacity="1" stroke="hsl(var(--background))" strokeWidth="0.6" /></g>;
}

function PreviewHeader({ percentage }: { percentage: number }) {
  const status = capacityStatus(percentage);
  return <div className="flex items-center justify-between"><h3 className="font-display font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Preview da Caixa</h3><Badge variant="outline" className={cn('text-[10px]', status.color === 'destructive' && 'border-destructive text-destructive', status.color === 'warning' && 'border-warning text-warning', status.color === 'primary' && 'border-primary text-primary')}>{percentage.toFixed(0)}% — {status.label}</Badge></div>;
}

function PreviewSvg({ box, items }: { box: KitBox; items: PlacedItem[] }) {
  const projection = buildProjection(box);
  const { corner, tx, ty } = projection;
  const bottom = facePath([corner(0), corner(1), corner(2), corner(3)], tx, ty);
  const back = facePath([corner(1), corner(2), corner(6), corner(5)], tx, ty);
  const left = facePath([corner(0), corner(3), corner(7), corner(4)], tx, ty);
  const top = facePath([corner(4), corner(5), corner(6), corner(7)], tx, ty);
  return <div className="bg-muted/30 rounded-lg p-2 flex items-center justify-center"><svg viewBox={`0 0 ${projection.viewBoxWidth} ${projection.viewBoxHeight}`} className="w-full h-auto max-h-[280px]" role="img" aria-label={`Visualização isométrica da caixa ${box.name} com ${items.length} itens`}><path d={bottom} fill="hsl(var(--muted))" fillOpacity="0.4" stroke="hsl(var(--border))" strokeWidth="1" /><path d={back} fill="hsl(var(--muted))" fillOpacity="0.25" stroke="hsl(var(--border))" strokeWidth="1" /><path d={left} fill="hsl(var(--muted))" fillOpacity="0.3" stroke="hsl(var(--border))" strokeWidth="1" />{items.map(item => <PreviewItem key={item.id} item={item} tx={tx} ty={ty} />)}<path d={top} fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="3 2" /></svg></div>;
}

function PreviewFooter({ box, placedCount, totalRequested }: { box: KitBox; placedCount: number; totalRequested: number }) {
  const overflowCount = Math.max(0, totalRequested - placedCount);
  return <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{box.internalWidth}×{box.internalHeight}×{box.internalDepth} cm — {box.name}</span><span>{placedCount}/{totalRequested} itens visíveis{overflowCount > 0 && <span className="text-destructive ml-1">(+{overflowCount} fora)</span>}</span></div>;
}

export function KitIsometricPreview({ kitState, className }: KitIsometricPreviewProps) {
  const { box, items, volumeUsagePercent } = kitState;
  const layout = useMemo(() => box ? buildPreviewLayout(box, items) : null, [box, items]);
  if (!box || !layout) return <Card className={cn('flex items-center justify-center p-8 text-muted-foreground', className)}><Package className="h-5 w-5 mr-2" /> Selecione uma caixa para visualizar</Card>;
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4 space-y-3">
        <PreviewHeader percentage={volumeUsagePercent} />
        <PreviewSvg box={box} items={layout.sorted} />
        <PreviewFooter box={box} placedCount={layout.sorted.length} totalRequested={layout.totalRequested} />
      </CardContent>
    </Card>
  );
}
