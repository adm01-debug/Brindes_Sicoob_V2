import { Box, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { KitComponent, BoxInternalDimensions } from './types';

interface BoxSizeMm {
  height: number;
  width: number;
  length: number;
  volume: number;
}

function toMillimeters(value: number | null | undefined): number {
  return (value ?? 0) * 10;
}

function getBoxSize(dimensions: BoxInternalDimensions | undefined): BoxSizeMm | null {
  const height = toMillimeters(dimensions?.height_cm);
  const width = toMillimeters(dimensions?.width_cm);
  const length = toMillimeters(dimensions?.length_cm);
  if (height <= 0 || width <= 0 || length <= 0) return null;
  return { height, width, length, volume: height * width * length };
}

function getComponentVolumes(components: KitComponent[]) {
  return components.filter(component => !component.is_packaging && component.is_active).map(component => {
    const height = component.height_mm ?? 0;
    const width = component.width_mm ?? 0;
    const length = component.length_mm ?? 0;
    const unitVolume = height * width * length;
    return {
      ...component,
      unitVolume,
      totalVolume: unitVolume * (component.quantity ?? 1),
      hasDimensions: height > 0 && width > 0 && length > 0,
    };
  });
}

function getTotalWeight(components: KitComponent[]): number {
  return components
    .filter(component => component.is_active)
    .reduce((sum, component) => sum + ((component.weight_g ?? 0) * (component.quantity ?? 1)), 0);
}

function itemFitsBox(height: number, width: number, length: number, box: BoxSizeMm): boolean {
  const dimensions = [height, width, length].sort((left, right) => left - right);
  const boxDimensions = [box.height, box.width, box.length].sort((left, right) => left - right);
  return dimensions.every((value, index) => value <= (boxDimensions[index] ?? 0));
}

type ComponentVolume = ReturnType<typeof getComponentVolumes>[number];

function VolumeHeader({ fits }: { fits: boolean }) {
  return <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Box className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-foreground">Validação de Volume</span></div><Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 gap-1", fits ? "border-success/50 text-success bg-success/10" : "border-destructive/50 text-destructive bg-destructive/10")}>{fits ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{fits ? "CABE" : "NÃO CABE"}</Badge></div>;
}

function VolumeUsage({ used, box, percent, fits }: { used: number; box: BoxSizeMm; percent: number; fits: boolean }) {
  return <div className="space-y-1"><div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>Volume usado: <strong className="text-foreground">{(used / 1000).toFixed(0)} cm³</strong> / {(box.volume / 1000).toFixed(0)} cm³</span><span className={cn("font-bold", fits ? "text-success" : "text-destructive")}>{percent}%</span></div><Progress value={Math.min(percent, 100)} className={cn("h-2", !fits && "[&>div]:bg-destructive")} /></div>;
}

function ComponentVolumeRows({ components, box }: { components: ComponentVolume[]; box: BoxSizeMm }) {
  if (components.length === 0) return null;
  return <div className="space-y-1 pt-1 border-t border-border/50">{components.map((component) => { const fits = component.hasDimensions ? itemFitsBox(component.height_mm ?? 0, component.width_mm ?? 0, component.length_mm ?? 0, box) : null; return <div key={component.id} className="flex items-center justify-between text-[10px]"><span className="truncate flex-1 text-muted-foreground">{component.component_name || 'Sem nome'} {(component.quantity ?? 1) > 1 ? `×${component.quantity}` : ''}</span>{component.hasDimensions ? <div className="flex items-center gap-2 shrink-0"><span className="text-muted-foreground font-mono">{component.width_mm}×{component.length_mm}×{component.height_mm} mm</span>{fits ? <CheckCircle2 className="h-3 w-3 text-success" /> : <XCircle className="h-3 w-3 text-destructive" />}</div> : <span className="text-warning italic">sem dimensões</span>}</div>; })}</div>;
}

export function VolumeValidation({ components, boxDimensions }: { components: KitComponent[]; boxDimensions?: BoxInternalDimensions }) {
  const box = getBoxSize(boxDimensions);
  const componentVolumes = getComponentVolumes(components);

  const totalComponentsVolume = componentVolumes.reduce((sum, c) => sum + c.totalVolume, 0);
  const totalWeight = getTotalWeight(components);
  const missingDimensions = componentVolumes.filter(c => !c.hasDimensions);

  if (!box) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Box className="h-4 w-4 shrink-0" />
        <span>Preencha as <strong>dimensões internas</strong> na aba Detalhes para validar volume dos componentes.</span>
      </div>
    );
  }

  const usagePercent = Math.round((totalComponentsVolume / box.volume) * 100);
  const fits = usagePercent <= 100;

  return (
    <div className={cn("rounded-lg border p-3 space-y-2.5 text-xs", (fits ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"))}>
      <VolumeHeader fits={fits} />
      <VolumeUsage used={totalComponentsVolume} box={box} percent={usagePercent} fits={fits} />

      {(<div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>Caixa interna: {box.width.toFixed(0)}×{box.length.toFixed(0)}×{box.height.toFixed(0)} mm</span>
        {totalWeight > 0 && <span>• Peso total: {(totalWeight / 1000).toFixed(2)} kg</span>}
      </div>)}

      <ComponentVolumeRows components={componentVolumes} box={box} />

      {(missingDimensions.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-warning pt-0.5">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {missingDimensions.length} componente(s) sem dimensões — o cálculo pode ser impreciso.
        </div>
      ))}
    </div>
  );
}
