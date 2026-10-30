/**
 * TechniqueColorConfigDialog — Modal for technique-specific color configuration
 * 
 * Handles 3 categories:
 * - Laser: Light/Dark tone selection
 * - Serigrafia: 1-3 color Pantone selection from detected logo colors
 * - Digital UV / others: Full color (policromia) — informational only
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Paintbrush, Palette, Zap, Check, Info } from "lucide-react";
import type { DetectedColor } from "@/hooks/useLogoColorAnalysis";
import { type TechniqueColorConfig, type LaserTone, classifyTechnique } from "./techniqueColorUtils";

// Re-export types and utils from shared module
export type { TechniqueCategory, LaserTone, TechniqueColorConfig } from "./techniqueColorUtils";
export { classifyTechnique, techniqueNeedsColorConfig } from "./techniqueColorUtils";


// ─── Helpers ─────────────────────────────────────────────────────────

const LASER_TONES: Record<LaserTone, { label: string; hex: string; description: string }> = {
  claro: {
    label: "Laser Claro",
    hex: "#C0C0C0",
    description: "Tom cinza claro — ideal para superfícies escuras",
  },
  escuro: {
    label: "Laser Escuro",
    hex: "#4A4A4A",
    description: "Tom chumbo/escuro — ideal para superfícies claras",
  },
};
// ─── Component ───────────────────────────────────────────────────────

interface TechniqueColorConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  techniqueName: string;
  techniqueCode?: string | null;
  detectedColors: DetectedColor[];
  currentConfig?: TechniqueColorConfig | null;
  onConfirm: (config: TechniqueColorConfig) => void;
}

function LaserOptions({ value, onChange }: { value: LaserTone; onChange: (tone: LaserTone) => void }) {
  return <div className="space-y-3"><Label className="text-sm font-medium">Tom da Gravação</Label><RadioGroup value={value} onValueChange={(tone) => onChange(tone as LaserTone)} className="grid grid-cols-2 gap-3">{(Object.entries(LASER_TONES) as [LaserTone, typeof LASER_TONES.claro][]).map(([key, tone]) => <label key={key} className={cn("relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all", value === key ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:border-primary/30")}><RadioGroupItem value={key} className="sr-only" /><div className="w-12 h-12 rounded-full border-2 shadow-inner" style={{ backgroundColor: tone.hex, borderColor: `${tone.hex}80` }} /><span className="text-sm font-medium">{tone.label}</span><span className="text-[10px] text-muted-foreground text-center leading-tight">{tone.description}</span>{value === key ? <div className="absolute top-2 right-2"><Check className="h-4 w-4 text-primary" /></div> : null}</label>)}</RadioGroup><div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>O logo será convertido automaticamente para monocromia no tom selecionado. A gravação a laser produz apenas um tom sobre o material.</span></div></div>;
}

function PantoneOption({ color, index, selectedIndices, colorCount, onToggle }: { color: DetectedColor; index: number; selectedIndices: number[]; colorCount: number; onToggle: (index: number) => void }) {
  const isSelected = selectedIndices.includes(index);
  const atMax = !isSelected && selectedIndices.length >= colorCount;
  const stateClass = isSelected ? "border-primary bg-primary/5" : atMax ? "border-muted/50 hover:border-primary/20" : "border-muted hover:border-primary/30";
  const pantoneLabel = color.selectedPantone || color.pantoneMatch?.pantoneCode || color.name;
  return <label className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all", stateClass)}><Checkbox checked={isSelected} onCheckedChange={() => onToggle(index)} /><div className="w-8 h-8 rounded border shadow-sm shrink-0" style={{ backgroundColor: color.hex }} /><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{pantoneLabel}</div><div className="text-[10px] text-muted-foreground">{color.hex} • {color.name}</div></div>{isSelected ? <Badge variant="secondary" className="text-[10px] shrink-0">#{selectedIndices.indexOf(index) + 1}</Badge> : null}</label>;
}

function PantoneSelection({ colors, selectedIndices, colorCount, onToggle }: { colors: DetectedColor[]; selectedIndices: number[]; colorCount: number; onToggle: (index: number) => void }) {
  if (!colors.length) return <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 dark:bg-warning/10 border border-warning/20 dark:border-warning/40"><Info className="h-4 w-4 text-warning mt-0.5 shrink-0" /><div className="text-xs text-warning dark:text-warning"><p className="font-medium mb-1">Cores não detectadas</p><p>Faça upload do logo primeiro para detectar as cores Pantone automaticamente. Você poderá configurar as cores após o upload.</p></div></div>;
  const label = colorCount === 1 ? "a cor" : `até ${colorCount} cores`;
  return <div className="space-y-2"><Label className="text-sm font-medium">Selecione {label} Pantone</Label><div className="grid gap-2">{colors.map((color, index) => <PantoneOption key={`${color.hex}-${index}`} color={color} index={index} selectedIndices={selectedIndices} colorCount={colorCount} onToggle={onToggle} />)}</div></div>;
}

function ScreenPrintOptions({ colors, colorCount, selectedIndices, onCountChange, onToggle }: { colors: DetectedColor[]; colorCount: number; selectedIndices: number[]; onCountChange: (count: number) => void; onToggle: (index: number) => void }) {
  const help = colorCount === 1 ? "O logo será convertido para monocromia na cor Pantone selecionada." : `O logo será simplificado para ${colorCount} cores Pantone selecionadas.`;
  return <div className="space-y-4"><div className="space-y-2"><Label className="text-sm font-medium">Quantidade de Cores</Label><div className="flex gap-2">{[1, 2, 3].map((count) => <Button key={count} variant={colorCount === count ? "default" : "outline"} size="sm" onClick={() => onCountChange(count)} className="flex-1">{count} {count === 1 ? "cor" : "cores"}</Button>)}</div></div><PantoneSelection colors={colors} selectedIndices={selectedIndices} colorCount={colorCount} onToggle={onToggle} /><div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground"><Paintbrush className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{help}</span></div></div>;
}

function FullColorOptions() {
  return <div className="flex flex-col items-center gap-3 py-4"><div className="w-16 h-16 rounded-full bg-gradient-to-br from-destructive via-success to-info flex items-center justify-center"><Zap className="h-8 w-8 text-primary-foreground" /></div><Badge className="text-sm px-3 py-1">Policromia (Full Color)</Badge><p className="text-sm text-muted-foreground text-center max-w-xs">Esta técnica suporta impressão em cores completas. O logo será aplicado sem restrições de cores.</p></div>;
}

function ColorConfiguration({ category, laserTone, colorCount, selectedIndices, detectedColors, setLaserTone, setColorCount, onPantoneToggle }: { category: TechniqueColorConfig["category"]; laserTone: LaserTone; colorCount: number; selectedIndices: number[]; detectedColors: DetectedColor[]; setLaserTone: (tone: LaserTone) => void; setColorCount: (count: number) => void; onPantoneToggle: (index: number) => void }) {
  if (category === "laser") return <LaserOptions value={laserTone} onChange={setLaserTone} />;
  if (category === "serigrafia") return <ScreenPrintOptions colors={detectedColors} colorCount={colorCount} selectedIndices={selectedIndices} onCountChange={setColorCount} onToggle={onPantoneToggle} />;
  return <FullColorOptions />;
}

function categoryDescription(category: TechniqueColorConfig["category"]) {
  if (category === "laser") return "Selecione o tom de gravação";
  if (category === "serigrafia") return "Selecione as cores para impressão";
  return "Impressão em policromia (full color)";
}

function buildTechniqueColorConfig({ category, laserTone, colorCount, selectedIndices, detectedColors }: { category: TechniqueColorConfig["category"]; laserTone: LaserTone; colorCount: number; selectedIndices: number[]; detectedColors: DetectedColor[] }): TechniqueColorConfig {
  if (category === "laser") return { category, laserTone };
  if (category !== "serigrafia") return { category, isFullColor: true };
  const selectedColors = selectedIndices
    .map((index) => detectedColors[index])
    .filter((color): color is DetectedColor => color !== undefined)
    .map((color) => ({
      hex: color.hex,
      pantoneCode: color.selectedPantone || color.pantoneMatch?.pantoneCode || color.name,
    }));
  return { category, colorCount, selectedPantoneIndices: selectedIndices, selectedColors };
}

function useTechniqueState(open: boolean, currentConfig: TechniqueColorConfig | null | undefined) {
  const [laserTone, setLaserTone] = useState<LaserTone>(currentConfig?.laserTone || "escuro");
  const [colorCount, setColorCount] = useState(currentConfig?.colorCount || 1);
  const [selectedIndices, setSelectedIndices] = useState<number[]>(currentConfig?.selectedPantoneIndices || []);
  useEffect(() => {
    if (!open) return;
    setLaserTone(currentConfig?.laserTone || "escuro");
    setColorCount(currentConfig?.colorCount || 1);
    setSelectedIndices(currentConfig?.selectedPantoneIndices || []);
  }, [open, currentConfig]);
  useEffect(() => {
    if (selectedIndices.length > colorCount) setSelectedIndices((previous) => previous.slice(0, colorCount));
  }, [colorCount, selectedIndices.length]);
  const togglePantone = useCallback((index: number) => {
    setSelectedIndices((previous) => {
      if (previous.includes(index)) return previous.filter((item) => item !== index);
      if (previous.length >= colorCount) return [...previous.slice(0, colorCount - 1), index];
      return [...previous, index];
    });
  }, [colorCount]);
  return { laserTone, setLaserTone, colorCount, setColorCount, selectedIndices, togglePantone };
}

function isColorConfigurationValid(category: TechniqueColorConfig["category"], detectedColorCount: number, selectedCount: number, colorCount: number) {
  if (category !== "serigrafia" || detectedColorCount === 0) return true;
  return selectedCount > 0 && selectedCount <= colorCount;
}

interface DialogBodyProps {
  techniqueName: string;
  category: TechniqueColorConfig["category"];
  state: ReturnType<typeof useTechniqueState>;
  detectedColors: DetectedColor[];
  onCancel: () => void;
  onConfirm: () => void;
}

function DialogBody({ techniqueName, category, state, detectedColors, onCancel, onConfirm }: DialogBodyProps) {
  const valid = isColorConfigurationValid(category, detectedColors.length, state.selectedIndices.length, state.colorCount);
  return <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />Configuração de Cores</DialogTitle><DialogDescription><span className="font-medium text-foreground">{techniqueName}</span>{" — "}{categoryDescription(category)}</DialogDescription></DialogHeader><div className="space-y-6 py-2"><ColorConfiguration category={category} laserTone={state.laserTone} colorCount={state.colorCount} selectedIndices={state.selectedIndices} detectedColors={detectedColors} setLaserTone={state.setLaserTone} setColorCount={state.setColorCount} onPantoneToggle={state.togglePantone} /></div><DialogFooter><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button onClick={onConfirm} disabled={!valid}><Check className="h-4 w-4 mr-1.5" />Confirmar</Button></DialogFooter></DialogContent>;
}

export function TechniqueColorConfigDialog({
  open,
  onOpenChange,
  techniqueName,
  techniqueCode,
  detectedColors,
  currentConfig,
  onConfirm,
}: TechniqueColorConfigDialogProps) {
  const category = useMemo(
    () => classifyTechnique(techniqueName, techniqueCode),
    [techniqueName, techniqueCode]
  );
  const state = useTechniqueState(open, currentConfig);
  const handleConfirm = useCallback(() => {
    onConfirm(buildTechniqueColorConfig({ category, laserTone: state.laserTone, colorCount: state.colorCount, selectedIndices: state.selectedIndices, detectedColors }));
    onOpenChange(false);
  }, [category, detectedColors, onConfirm, onOpenChange, state.colorCount, state.laserTone, state.selectedIndices]);
  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogBody techniqueName={techniqueName} category={category} state={state} detectedColors={detectedColors} onCancel={handleCancel} onConfirm={handleConfirm} /></Dialog>;
}
