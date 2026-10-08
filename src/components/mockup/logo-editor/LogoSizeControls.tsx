import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Ruler, Target, Lock, Minus, Plus } from "lucide-react";

interface LogoSizeControlsProps {
  logoPreview: string | null;
  logoWidth: number;
  logoHeight: number;
  logoScale: number;
  logoRotation: number;
  positionX: number;
  positionY: number;
  maxWidth?: number | null;
  maxHeight?: number | null;
  onSizeChange: (width: number, height: number) => void;
  onLogoScaleChange?: (scale: number) => void;
}

interface NumericControlProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function firstSliderValue(values: number[], fallback: number) {
  return values[0] ?? fallback;
}

function NumericControl({
  label,
  value,
  unit,
  min,
  max,
  step,
  disabled = false,
  onChange,
}: NumericControlProps) {
  const decreaseDisabled = disabled || value <= min;
  const increaseDisabled = disabled || value >= max;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label={`Diminuir ${label.toLowerCase()}`} className="h-7 w-7" disabled={decreaseDisabled} onClick={() => onChange(Math.max(min, value - step))}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-xs font-bold min-w-[44px] text-center bg-muted/50 rounded px-1.5 py-0.5">{value}{unit}</span>
          <Button variant="outline" size="icon" aria-label={`Aumentar ${label.toLowerCase()}`} className="h-7 w-7" disabled={increaseDisabled} onClick={() => onChange(Math.min(max, value + step))}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <Slider value={[value]} onValueChange={(values) => onChange(firstSliderValue(values, value))} min={min} max={max} step={step} disabled={disabled} />
    </div>
  );
}

interface EngravingAreaProps {
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
  hasDefinedMaximum: boolean;
  onChange: (width: number, height: number) => void;
}

function EngravingArea({ width, height, maxWidth, maxHeight, hasDefinedMaximum, onChange }: EngravingAreaProps) {
  return (
    <div className="w-1/2 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Ruler className="h-4 w-4 text-primary" /><span className="text-xs font-semibold">Área de Gravação</span></div>
        {hasDefinedMaximum && <Badge variant="outline" className="text-[10px]">Máx {maxWidth}×{maxHeight}cm</Badge>}
      </div>
      <NumericControl label="Largura" value={width} unit="cm" min={1} max={maxWidth} step={0.5} onChange={(nextWidth) => onChange(nextWidth, height)} />
      <NumericControl label="Altura" value={height} unit="cm" min={1} max={maxHeight} step={0.5} onChange={(nextHeight) => onChange(width, nextHeight)} />
      <div className="flex items-center justify-end">
        {hasDefinedMaximum && (
          <Button variant="ghost" size="sm" className="text-[10px] h-7 text-primary hover:text-primary px-1.5" onClick={() => onChange(maxWidth, maxHeight)}>
            <Target className="h-3 w-3 mr-1" />Máxima
          </Button>
        )}
      </div>
    </div>
  );
}

interface LogoScaleProps {
  enabled: boolean;
  scale: number;
  rotation: number;
  positionX: number;
  positionY: number;
  areaWidth: number;
  areaHeight: number;
  onChange: (scale: number) => void;
}

function LogoScale({ enabled, scale, rotation, positionX, positionY, areaWidth, areaHeight, onChange }: LogoScaleProps) {
  return (
    <div className="w-1/2 space-y-3">
      <div className="flex items-center gap-2"><Ruler className="h-4 w-4 text-primary" /><span className="text-xs font-semibold">Tamanho da Logo</span></div>
      <NumericControl label="Escala" value={scale} unit="%" min={10} max={500} step={5} disabled={!enabled} onChange={onChange} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3 w-3 text-primary" /><span>Proporção protegida</span></div>
        <Button variant="ghost" size="sm" className="text-[10px] h-7 text-primary hover:text-primary px-1.5" onClick={() => onChange(100)} disabled={!enabled || scale === 100}>
          <Target className="h-3 w-3 mr-1" />Resetar 100%
        </Button>
      </div>
      <div className="pt-2 border-t">
        <div className="flex flex-col gap-1 text-[10px] text-muted-foreground">
          <span>Pos: {positionX}% × {positionY}%</span><span>Área: {areaWidth}×{areaHeight}cm</span>
          <span>Escala: {scale}%{rotation ? ` · Rot: ${rotation}°` : ""}</span>
        </div>
      </div>
    </div>
  );
}

export function LogoSizeControls({
  logoPreview,
  logoWidth,
  logoHeight,
  logoScale,
  logoRotation,
  positionX,
  positionY,
  maxWidth,
  maxHeight,
  onSizeChange,
  onLogoScaleChange,
}: LogoSizeControlsProps) {
  const effectiveMaxW = maxWidth && maxWidth > 0 ? maxWidth : 20;
  const effectiveMaxH = maxHeight && maxHeight > 0 ? maxHeight : 20;
  const hasDefinedMaximum = Boolean(maxWidth && maxHeight && maxWidth > 0 && maxHeight > 0);
  const changeScale = (scale: number) => onLogoScaleChange?.(scale);

  return (
    <div className="flex gap-4 pt-2 border-t">
      <EngravingArea width={logoWidth} height={logoHeight} maxWidth={effectiveMaxW} maxHeight={effectiveMaxH} hasDefinedMaximum={hasDefinedMaximum} onChange={onSizeChange} />
      <LogoScale enabled={Boolean(logoPreview)} scale={logoScale} rotation={logoRotation} positionX={positionX} positionY={positionY} areaWidth={logoWidth} areaHeight={logoHeight} onChange={changeScale} />
    </div>
  );
}
