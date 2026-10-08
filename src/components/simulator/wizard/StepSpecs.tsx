/**
 * StepSpecs - Passo 3: Especificações da Gravação (v6)
 * 
 * Configura: cores (se cobra_por_cor), tamanho (se usa_dimensao)
 * Campos condicionais baseados nos dados v6 das técnicas disponíveis.
 */

import { useMemo } from 'react';
import { useLivePricePreview } from '@/hooks/simulator/useLivePricePreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  SlidersHorizontal, 
  Palette, 
  Ruler,
  DollarSign,
  ChevronLeft,
  ChevronDown,
  AlertTriangle,
  BarChart3,
  Loader2,
  Info,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface StepSpecsProps {
  wizard: UseSimulatorWizardReturn;
}

type SelectedLocation = NonNullable<UseSimulatorWizardReturn['selectedLocation']>;
type EngravingSpecs = UseSimulatorWizardReturn['engravingSpecs'];
type PriceEstimate = NonNullable<ReturnType<typeof useLivePricePreview>['estimate']>;
type AvailableTechniques = NonNullable<SelectedLocation['availableTechniques']>;

const EMPTY_TECHNIQUES: AvailableTechniques = [];

function fallbackNumber(value: number | null | undefined, fallback: number) {
  return value && value > 0 ? value : fallback;
}

function techniqueLimits(techniques: AvailableTechniques, location: SelectedLocation | null) {
  if (techniques.length === 0) return { anyUsaDimensao: true, anyCobraPorCor: true, maxColors: 3, maxWidth: 50, maxHeight: 50 };
  const colorTechniques = techniques.filter(technique => technique.cobraPorCor === true);
  const dimensionTechniques = techniques.filter(technique => technique.usaDimensao !== false);
  const locationWidth = fallbackNumber(location?.maxWidthCm, 50);
  const locationHeight = fallbackNumber(location?.maxHeightCm, 50);
  const colorValues = colorTechniques.map(technique => fallbackNumber(technique.maxColors, 3));
  const widthValues = dimensionTechniques.map(technique => fallbackNumber(technique.efetivaLarguraMax, fallbackNumber(technique.areaMaxWidth, locationWidth)));
  const heightValues = dimensionTechniques.map(technique => fallbackNumber(technique.efetivaAlturaMax, fallbackNumber(technique.areaMaxHeight, locationHeight)));
  return {
    anyUsaDimensao: dimensionTechniques.length > 0,
    anyCobraPorCor: colorTechniques.length > 0,
    maxColors: colorValues.length > 0 ? Math.max(...colorValues) : 1,
    maxWidth: widthValues.length > 0 ? Math.max(...widthValues) : locationWidth,
    maxHeight: heightValues.length > 0 ? Math.max(...heightValues) : locationHeight,
  };
}

function compatibleTechniqueCount(techniques: AvailableTechniques, colors: number) {
  return techniques.filter(technique => !technique.cobraPorCor || technique.maxColors === null || technique.maxColors <= 0 || colors <= technique.maxColors).length;
}

function SpecsHeader({ count }: { readonly count: number }) {
  return <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5"><SlidersHorizontal className="h-6 w-6 text-primary" /></div><div><h3 className="font-display text-xl font-bold">Especificações da Gravação</h3><p className="text-muted-foreground">{count} {count === 1 ? 'técnica disponível' : 'técnicas disponíveis'} neste local</p></div></div>;
}

interface ColorSpecsProps {
  readonly chargesByColor: boolean;
  readonly maxColors: number;
  readonly specs: EngravingSpecs;
  readonly estimate: PriceEstimate | null | undefined;
  readonly priceLoading: boolean;
  readonly onUpdate: UseSimulatorWizardReturn['updateSpecs'];
}

function ColorSpecs(props: ColorSpecsProps) {
  if (!props.chargesByColor) return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl bg-card border shadow-sm"><div className="flex items-center gap-3 mb-3"><div className="p-2 rounded-xl bg-primary/10"><Palette className="h-5 w-5 text-primary" /></div><h4 className="font-bold text-lg">Cores</h4></div><div className="flex items-center gap-2 text-sm text-muted-foreground"><Info className="h-4 w-4" /><span>Full Color — todas as técnicas neste local são de impressão digital (sem limite de cores)</span></div></motion.div>;
  const showEstimate = Boolean(props.estimate) && !props.priceLoading && props.specs.colors > 1;
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl bg-card border shadow-sm"><div className="flex items-center justify-between mb-5"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-primary/10"><Palette className="h-5 w-5 text-primary" /></div><h4 className="font-bold text-lg">Nº de Cores</h4></div><Badge variant="outline" className="text-xs">Máx {props.maxColors}</Badge></div><div className="flex flex-wrap gap-2">{Array.from({ length: props.maxColors }, (_, index) => index + 1).map(value => <Button key={value} variant={props.specs.colors === value ? 'default' : 'outline'} size="sm" onClick={() => props.onUpdate({ colors: value })} className={cn('h-12 px-5 rounded-xl text-sm font-bold', props.specs.colors === value && 'shadow-lg shadow-primary/20')}>{value} {value === 1 ? 'cor' : 'cores'}</Button>)}</div>{showEstimate && props.estimate ? <p className="text-sm text-muted-foreground mt-4">{props.specs.colors} cores • Estimativa: <span className="font-semibold text-primary">{formatCurrency(props.estimate.unitPrice)}/un</span></p> : <p className="text-sm text-muted-foreground mt-4">{props.specs.colors === 1 ? '1 cor de gravação' : `${props.specs.colors} cores selecionadas`}</p>}</motion.div>;
}

interface DimensionInputProps {
  readonly label: string;
  readonly value: number;
  readonly maximum: number;
  readonly field: 'width' | 'height';
  readonly onUpdate: UseSimulatorWizardReturn['updateSpecs'];
}

function DimensionInput({ label, value, maximum, field, onUpdate }: DimensionInputProps) {
  const update = (next: number) => onUpdate({ [field]: next });
  return <div className="space-y-2 mb-5"><div className="flex justify-between items-center text-sm"><Label className="font-medium">{label}</Label><div className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => update(Math.max(0.5, value - 0.5))} disabled={value <= 0.5} aria-label={`Diminuir ${label.toLowerCase()}`}>−</Button><Input type="number" value={value} onChange={event => { const next = parseFloat(event.target.value); if (!Number.isNaN(next) && next >= 0.5 && next <= maximum) update(next); }} min={0.5} max={maximum} step={0.5} className="w-20 h-7 text-center text-sm font-bold rounded-lg" /><Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => update(Math.min(maximum, value + 0.5))} disabled={value >= maximum} aria-label={`Aumentar ${label.toLowerCase()}`}>+</Button><span className="text-xs text-muted-foreground ml-1">cm</span></div></div><Slider value={[value]} min={0.5} max={maximum} step={0.5} onValueChange={([next]) => update(next ?? value)} className="opacity-60" /></div>;
}

interface DimensionSpecsProps {
  readonly visible: boolean;
  readonly specs: EngravingSpecs;
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly maxArea: number;
  readonly areaExceeded: boolean;
  readonly onUpdate: UseSimulatorWizardReturn['updateSpecs'];
}

function DimensionSpecs(props: DimensionSpecsProps) {
  if (!props.visible) return null;
  const currentArea = props.specs.width * props.specs.height;
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cn('p-6 rounded-3xl border shadow-sm', props.areaExceeded ? 'bg-warning/5 border-warning/30' : 'bg-card')}><div className="flex items-center justify-between mb-5"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-primary/10"><Ruler className="h-5 w-5 text-primary" /></div><h4 className="font-bold text-lg">Tamanho</h4></div><Badge variant="outline">Máx {props.maxWidth}×{props.maxHeight}cm</Badge></div><DimensionInput label="Largura" value={props.specs.width} maximum={props.maxWidth} field="width" onUpdate={props.onUpdate} /><DimensionInput label="Altura" value={props.specs.height} maximum={props.maxHeight} field="height" onUpdate={props.onUpdate} /><Button variant="outline" size="sm" className="w-full mb-4 gap-2 text-xs" onClick={() => props.onUpdate({ width: props.maxWidth, height: props.maxHeight })}><Ruler className="h-3 w-3" />Área Máxima ({props.maxWidth}×{props.maxHeight}cm)</Button><div className={cn('p-4 rounded-2xl border transition-colors', props.areaExceeded ? 'bg-warning/10 border-warning' : 'bg-muted/50')}><div className="flex items-center justify-between"><span className="text-sm font-medium">Área total</span><div className="flex items-center gap-2">{props.areaExceeded && <AlertTriangle className="h-4 w-4 text-warning" />}<span className={cn('font-bold text-lg', props.areaExceeded && 'text-warning')}>{currentArea.toFixed(1)}cm²</span></div></div>{props.areaExceeded && <p className="text-xs text-warning mt-2">⚠️ Excede o máximo permitido de {props.maxArea}cm²</p>}</div></motion.div>;
}

function CompatibilityNotice({ compatibleCount, totalCount, colors }: { readonly compatibleCount: number; readonly totalCount: number; readonly colors: number }) {
  if (compatibleCount >= totalCount) return null;
  return <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20 text-sm text-warning-foreground"><AlertTriangle className="h-4 w-4 shrink-0" /><span>Com {colors} {colors === 1 ? 'cor' : 'cores'}, apenas {compatibleCount} de {totalCount} técnicas serão compatíveis.</span></div>;
}

function hasDimensions(breakdown: PriceEstimate['breakdown']) {
  return breakdown.width !== null && breakdown.width !== undefined && breakdown.height !== null && breakdown.height !== undefined;
}

function BreakdownDimensions({ breakdown }: { readonly breakdown: PriceEstimate['breakdown'] }) {
  if (!hasDimensions(breakdown)) return <span className="text-muted-foreground/70">não usa dimensão</span>;
  return <>{breakdown.width}×{breakdown.height}cm{breakdown.areaCm2 !== null && breakdown.areaCm2 !== undefined && <span className="ml-1 text-muted-foreground/70">({breakdown.areaCm2}cm²)</span>}</>;
}

function MinimumApplied({ applied }: { readonly applied: boolean }) {
  if (!applied) return null;
  return <span className="ml-1 text-warning text-[10px]">⚠ aplicado</span>;
}

function ProductionDays({ days }: { readonly days: number | null | undefined }) {
  if (days === null || days === undefined) return null;
  return <div><p className="text-muted-foreground">Prazo produção</p><p className="font-semibold">{days} dias</p></div>;
}

function QuotationCode({ code }: { readonly code: string | null | undefined }) {
  if (!code) return null;
  return <div className="col-span-2 sm:col-span-3"><p className="text-muted-foreground">Código orçamento</p><p className="font-semibold font-mono text-[11px] truncate" title={code}>{code}</p></div>;
}

function tierQuantityLabel(maximum: number) {
  return maximum > 0 && maximum < 999999 ? ` – ${maximum}` : '+';
}

function EstimateBreakdown({ estimate }: { readonly estimate: PriceEstimate }) {
  const breakdown = estimate.breakdown;
  const tableCode = breakdown.tableCodeShort || breakdown.tableCode || '—';
  const tierLabel = tierQuantityLabel(breakdown.tierMaxQty);
  const colorLabel = breakdown.priceByColor ? `(máx ${breakdown.maxColors})` : '(full color)';
  return <Collapsible className="mt-3"><CollapsibleTrigger className="group flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"><ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />Ver detalhamento do cálculo</CollapsibleTrigger><CollapsibleContent className="mt-3"><div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 p-3 rounded-xl bg-background/60 border border-border/60 text-xs"><div><p className="text-muted-foreground">Área</p><p className="font-semibold truncate" title={breakdown.areaName}>{breakdown.areaName}{breakdown.areaCode && <span className="ml-1 text-muted-foreground/70">({breakdown.areaCode})</span>}</p></div><div><p className="text-muted-foreground">Técnica</p><p className="font-semibold truncate" title={estimate.cheapestName}>{estimate.cheapestName}{breakdown.techniqueGroup && <span className="ml-1 text-muted-foreground/70">· {breakdown.techniqueGroup}</span>}</p></div><div><p className="text-muted-foreground">Tabela</p><p className="font-semibold font-mono truncate" title={breakdown.tableCode ?? undefined}>{tableCode}</p></div><div><p className="text-muted-foreground">Tamanho</p><p className="font-semibold"><BreakdownDimensions breakdown={breakdown} /></p></div><div><p className="text-muted-foreground">Cores</p><p className="font-semibold">{breakdown.numColors}<span className="ml-1 text-muted-foreground/70">{colorLabel}</span></p></div><div><p className="text-muted-foreground">Faixa de quantidade</p><p className="font-semibold">{breakdown.tierMinQty}{tierLabel}</p></div><div><p className="text-muted-foreground">Subtotal peças</p><p className="font-semibold">{formatCurrency(breakdown.subtotalPieces)}</p></div><div><p className="text-muted-foreground">Setup / Mín.</p><p className="font-semibold">{formatCurrency(breakdown.setupTotal)}<MinimumApplied applied={breakdown.minimumApplied} /></p></div><div><p className="text-muted-foreground">Custo / un</p><p className="font-semibold">{formatCurrency(estimate.costPerUnit)}</p></div><ProductionDays days={estimate.productionDays} /><QuotationCode code={breakdown.quotationCode} /></div></CollapsibleContent></Collapsible>;
}

interface PricePreviewProps {
  readonly estimate: PriceEstimate | null | undefined;
  readonly loading: boolean;
  readonly areaExceeded: boolean;
}

function PricePreview({ estimate, loading, areaExceeded }: PricePreviewProps) {
  if ((!estimate && !loading) || areaExceeded) return null;
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-primary/10"><DollarSign className="h-4 w-4 text-primary" /></div><div><p className="text-xs text-muted-foreground uppercase tracking-wide">Estimativa de preço</p>{loading ? <div className="flex items-center gap-2 mt-1"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Calculando...</span></div> : estimate ? <p className="text-sm"><span className="font-bold text-primary text-lg">{formatCurrency(estimate.unitPrice)}</span><span className="text-muted-foreground">/un via {estimate.cheapestName}</span></p> : null}</div></div>{estimate && <div className="text-right"><p className="font-bold text-primary">{formatCurrency(estimate.totalPrice)}</p><p className="text-xs text-muted-foreground">total gravação</p></div>}</div><p className="text-[10px] text-muted-foreground/70 mt-2">* Estimativa baseada na técnica mais acessível. Clique em &quot;Comparar&quot; para ver todas.</p>{estimate && !loading && <EstimateBreakdown estimate={estimate} />}</motion.div>;
}

interface SpecsNavigationProps {
  readonly wizard: UseSimulatorWizardReturn;
  readonly areaExceeded: boolean;
  readonly techniqueCount: number;
  readonly estimate: PriceEstimate | null | undefined;
  readonly priceLoading: boolean;
  readonly onCompare: () => void;
}

function SpecsNavigation(props: SpecsNavigationProps) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex justify-between pt-6"><Button variant="ghost" size="lg" onClick={props.wizard.previousStep} className="gap-2"><ChevronLeft className="h-5 w-5" />Voltar</Button><div className="flex flex-col items-end gap-1"><Button disabled={props.wizard.isCalculating || props.areaExceeded} onClick={props.onCompare} size="lg" className="gap-3 min-w-[220px] h-14 rounded-xl shadow-lg shadow-primary/25 text-base">{props.wizard.isCalculating ? <><Loader2 className="h-5 w-5 animate-spin" />Calculando...</> : <><BarChart3 className="h-5 w-5" />Comparar {props.techniqueCount} Técnica{props.techniqueCount !== 1 ? 's' : ''}</>}</Button>{props.estimate && !props.priceLoading && <p className="text-[11px] text-muted-foreground/70">A partir de {formatCurrency(props.estimate.unitPrice)}/un</p>}</div></motion.div>;
}

function specsGridClass(hasDimensionsField: boolean, chargesByColor: boolean) {
  return cn(
    'grid gap-6 max-w-3xl',
    hasDimensionsField && chargesByColor ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1',
  );
}

interface LoadedStepSpecsProps {
  readonly wizard: UseSimulatorWizardReturn;
  readonly techniques: AvailableTechniques;
  readonly limits: ReturnType<typeof techniqueLimits>;
  readonly maxArea: number;
  readonly areaExceeded: boolean;
  readonly compatibleCount: number;
  readonly estimate: PriceEstimate | null | undefined;
  readonly priceLoading: boolean;
}

function LoadedStepSpecs(props: LoadedStepSpecsProps) {
  const { wizard, techniques, limits, maxArea, areaExceeded, compatibleCount, estimate, priceLoading } = props;
  const compare = async () => wizard.fetchComparisonPrices();
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <SpecsHeader count={techniques.length} />
      <div className={specsGridClass(limits.anyUsaDimensao, limits.anyCobraPorCor)}>
        <ColorSpecs chargesByColor={limits.anyCobraPorCor} maxColors={limits.maxColors} specs={wizard.engravingSpecs} estimate={estimate} priceLoading={priceLoading} onUpdate={wizard.updateSpecs} />
        <DimensionSpecs visible={limits.anyUsaDimensao} specs={wizard.engravingSpecs} maxWidth={limits.maxWidth} maxHeight={limits.maxHeight} maxArea={maxArea} areaExceeded={areaExceeded} onUpdate={wizard.updateSpecs} />
      </div>
      <CompatibilityNotice compatibleCount={compatibleCount} totalCount={techniques.length} colors={wizard.engravingSpecs.colors} />
      <PricePreview estimate={estimate} loading={priceLoading} areaExceeded={areaExceeded} />
      <SpecsNavigation wizard={wizard} areaExceeded={areaExceeded} techniqueCount={techniques.length} estimate={estimate} priceLoading={priceLoading} onCompare={compare} />
    </div>
  );
}

export function StepSpecs({ wizard }: StepSpecsProps) {
  const { selectedLocation, engravingSpecs } = wizard;
  const { estimate, isLoading: priceLoading } = useLivePricePreview({
    selectedLocation,
    engravingSpecs,
    quantity: wizard.quantity,
  });
  const techniques = selectedLocation?.availableTechniques ?? EMPTY_TECHNIQUES;
  const limits = useMemo(
    () => techniqueLimits(techniques, selectedLocation),
    [techniques, selectedLocation],
  );
  const maxArea = fallbackNumber(selectedLocation?.maxAreaCm2, limits.maxWidth * limits.maxHeight);
  const areaExceeded = limits.anyUsaDimensao && engravingSpecs.width * engravingSpecs.height > maxArea;
  const compatibleCount = useMemo(
    () => compatibleTechniqueCount(techniques, engravingSpecs.colors),
    [techniques, engravingSpecs.colors],
  );

  if (!selectedLocation) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Selecione um local de gravação primeiro.</p>
      </div>
    );
  }

  return (
    <LoadedStepSpecs wizard={wizard} techniques={techniques} limits={limits} maxArea={maxArea} areaExceeded={areaExceeded} compatibleCount={compatibleCount} estimate={estimate} priceLoading={priceLoading} />
  );
}
