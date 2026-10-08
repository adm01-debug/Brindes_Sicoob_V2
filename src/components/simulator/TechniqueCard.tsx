/**
 * TechniqueCard - Card individual de técnica com:
 * - Badge de recomendação IA
 * - Miniatura de exemplo
 * - Configuração inline
 *
 * Refatorado: helpers/preview/style extraídos para TechniqueCardHelpers.tsx
 */

import { motion, AnimatePresence } from 'framer-motion';
import type { KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard, HoverCardContent, HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Clock, DollarSign, Palette, Ruler, Info, Sparkles, Star, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/hooks/useSimulation';
import type { TechniqueSettings } from '@/types/simulation';
import type { TechniqueWithRecommendation } from '@/hooks/useTechniqueRecommendations';
import type { ColorOption, SizeOption } from '@/hooks/useTechniquePricingOptions';
import {
  getTechniqueStyle, getTechniqueThumbnail, getSlaInfo, TechniquePreview,
} from './TechniqueCardHelpers';

const PRIMARY_FOREGROUND_TEXT = 'text-primary-foreground';

interface TechniqueCardProps {
  technique: TechniqueWithRecommendation;
  isSelected: boolean;
  settings: TechniqueSettings;
  showColors: boolean;
  showSize: boolean;
  colorOptions: ColorOption[];
  sizeOptions: SizeOption[];
  quantity: number;
  onToggle: () => void;
  onUpdateSetting: (field: keyof TechniqueSettings, value: number) => void;
  viewMode: 'expanded' | 'compact';
}

type TechniqueStyle = ReturnType<typeof getTechniqueStyle>;

function CompactTechniqueVisual({ technique, thumbnail, style, selected }: { readonly technique: TechniqueWithRecommendation; readonly thumbnail: string | null; readonly style: TechniqueStyle; readonly selected: boolean }) {
  return <HoverCard openDelay={200}><HoverCardTrigger asChild><div className="relative flex-shrink-0">{thumbnail ? <div className="w-10 h-10 rounded-lg overflow-hidden ring-2 ring-border"><img src={thumbnail} alt={technique.name} className="w-full h-full object-cover" loading="lazy" /></div> : <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-lg', style.color, PRIMARY_FOREGROUND_TEXT)}>{style.icon}</div>}{selected && <motion.div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }}><span className="text-[8px] text-primary-foreground font-bold">✓</span></motion.div>}</div></HoverCardTrigger><HoverCardContent side="right" className="w-64 p-3"><TechniquePreview technique={technique} thumbnail={thumbnail} /></HoverCardContent></HoverCard>;
}

function ExpandedTechniqueVisual({ technique, thumbnail, style, selected }: { readonly technique: TechniqueWithRecommendation; readonly thumbnail: string | null; readonly style: TechniqueStyle; readonly selected: boolean }) {
  return <HoverCard openDelay={200}><HoverCardTrigger asChild><motion.div className="relative flex-shrink-0" animate={selected ? { boxShadow: ['0 0 0 0 rgba(99,102,241,0)', '0 0 0 6px rgba(99,102,241,0.1)', '0 0 0 0 rgba(99,102,241,0)'] } : {}} transition={{ duration: 2, repeat: Infinity }}>{thumbnail ? <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-border"><img src={thumbnail} alt={technique.name} className="w-full h-full object-cover" loading="lazy" /><div className={cn('absolute bottom-0 right-0 w-6 h-6 rounded-tl-lg rounded-br-lg flex items-center justify-center text-sm', style.color, PRIMARY_FOREGROUND_TEXT)}>{style.icon}</div></div> : <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center text-2xl', style.color, PRIMARY_FOREGROUND_TEXT)}>{style.icon}</div>}{selected && <motion.div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md" initial={{ scale: 0 }} animate={{ scale: 1 }}><span className="text-xs text-primary-foreground font-bold">✓</span></motion.div>}</motion.div></HoverCardTrigger><HoverCardContent side="right" className="w-72 p-4"><TechniquePreview technique={technique} thumbnail={thumbnail} expanded /></HoverCardContent></HoverCard>;
}

function CompactRecommendation({ technique }: { readonly technique: TechniqueWithRecommendation }) {
  if (!technique.recommendation.isRecommended) return null;
  return <><Badge className="bg-gradient-to-r from-warning to-orange text-primary-foreground text-[10px] px-1.5 h-5 gap-0.5"><Sparkles className="h-2.5 w-2.5" />IA</Badge></>;
}

function ExpandedRecommendation({ technique }: { readonly technique: TechniqueWithRecommendation }) {
  const { recommendation } = technique;
  if (!recommendation.isRecommended) return null;
  return <TooltipProvider><Tooltip><TooltipTrigger asChild><Badge className="bg-gradient-to-r from-warning to-orange text-primary-foreground text-xs gap-1"><Sparkles className="h-3 w-3" />Recomendada IA</Badge></TooltipTrigger><TooltipContent><p>{recommendation.recommendationReason}</p>{recommendation.matchedKeywords.length > 0 && <p className="text-xs text-muted-foreground mt-1">Match: {recommendation.matchedKeywords.join(', ')}</p>}</TooltipContent></Tooltip></TooltipProvider>;
}

type InlineConfigurationProps = Pick<TechniqueCardProps, 'settings' | 'showColors' | 'showSize' | 'colorOptions' | 'sizeOptions' | 'onUpdateSetting'> & { readonly visible: boolean; readonly className: string };

function InlineConfiguration({ visible, className, ...props }: InlineConfigurationProps) {
  return <AnimatePresence>{visible && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className={className}><InlineConfigForm settings={props.settings} showColors={props.showColors} showSize={props.showSize} colorOptions={props.colorOptions} sizeOptions={props.sizeOptions} onUpdateSetting={props.onUpdateSetting} /></div></motion.div>}</AnimatePresence>;
}

function RecommendedRibbon({ visible }: { readonly visible: boolean }) {
  if (!visible) return null;
  return <div className="absolute top-0 right-0 z-10"><div className="bg-gradient-to-l from-warning to-orange text-primary-foreground text-[10px] font-medium px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><Sparkles className="h-3 w-3" />Recomendada</div></div>;
}

function PopularityBadge({ score }: { readonly score: number }) {
  if (score < 70) return null;
  return <TooltipProvider><Tooltip><TooltipTrigger className="flex items-center gap-1 text-warning"><TrendingUp className="h-3.5 w-3.5" /><span className="text-xs">Popular</span></TooltipTrigger><TooltipContent><p>Alta demanda no mercado</p></TooltipContent></Tooltip></TooltipProvider>;
}

function RecommendationMatch({ technique }: { readonly technique: TechniqueWithRecommendation }) {
  if (!technique.recommendation.isRecommended) return null;
  return <div className="flex items-center gap-1 text-warning"><Star className="h-3 w-3 fill-current" /><span className="text-[10px] font-medium">{technique.recommendation.recommendationScore}% match</span></div>;
}

function techniqueCode(technique: TechniqueWithRecommendation) {
  return technique.code ?? '';
}

function hasInlineConfiguration(showColors: boolean, showSize: boolean) {
  return showColors || showSize;
}

function RecommendationReason({ technique }: { readonly technique: TechniqueWithRecommendation }) {
  if (!technique.recommendation.isRecommended) return null;
  return <p className="text-[10px] text-warning truncate">{technique.recommendation.recommendationReason}</p>;
}

function updateSelectedSize(value: string, onUpdate: TechniqueCardProps['onUpdateSetting']) {
  const [width, height] = value.split('x').map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return;
  onUpdate('width', width ?? 1);
  setTimeout(() => onUpdate('height', height ?? 1), 0);
}

interface TechniqueViewProps extends TechniqueCardProps {
  readonly style: ReturnType<typeof getTechniqueStyle>;
  readonly thumbnail: string | null;
  readonly sla: ReturnType<typeof getSlaInfo>;
  readonly estimatedCost: number;
  readonly showInlineConfig: boolean;
}

function CompactTechniqueCard(props: TechniqueViewProps) {
  return (
    <motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
      <div onClick={props.onToggle} className={cn('flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all', props.isSelected ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20' : 'border-border hover:border-primary/50 bg-card hover:shadow-sm')}>
        <CompactTechniqueVisual technique={props.technique} thumbnail={props.thumbnail} style={props.style} selected={props.isSelected} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2"><span className="font-medium text-sm truncate">{props.technique.name}</span><CompactRecommendation technique={props.technique} /><Badge variant="outline" className="text-[10px] font-mono px-1 h-4 hidden sm:inline-flex">{props.technique.code}</Badge></div>
          <RecommendationReason technique={props.technique} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0"><span className={cn('flex items-center gap-1', props.sla.textColor)}><Clock className="h-3 w-3" />{props.technique.estimated_days}d</span><span className="font-mono font-medium hidden sm:inline">{formatCurrency(props.estimatedCost)}</span></div>
      </div>
      <InlineConfiguration visible={props.showInlineConfig} className="p-3 ml-6 mt-1 border-l-2 border-primary/30 bg-muted/30 rounded-r-lg" settings={props.settings} showColors={props.showColors} showSize={props.showSize} colorOptions={props.colorOptions} sizeOptions={props.sizeOptions} onUpdateSetting={props.onUpdateSetting} />
    </motion.div>
  );
}

function ExpandedTechniqueCard(props: TechniqueViewProps) {
  const recommendation = props.technique.recommendation;
  const activate = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    props.onToggle();
  };
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} whileHover={{ scale: 1.005 }}>
      <div className={cn('relative rounded-xl border-2 transition-all duration-200 overflow-hidden', props.isSelected ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20' : 'border-border hover:border-primary/50 hover:shadow-md bg-card')}>
        <RecommendedRibbon visible={recommendation.isRecommended && !props.isSelected} />
        <div className="p-4 cursor-pointer" role="button" tabIndex={0} onClick={props.onToggle} onKeyDown={activate} aria-label={`Selecionar técnica ${props.technique.name}`}>
          <div className="flex items-start gap-4">
            <ExpandedTechniqueVisual technique={props.technique} thumbnail={props.thumbnail} style={props.style} selected={props.isSelected} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><h4 className="font-semibold text-base">{props.technique.name}</h4><Badge variant="outline" className="text-xs font-mono">{props.technique.code}</Badge><ExpandedRecommendation technique={props.technique} />{props.isSelected && <Badge className="bg-primary/20 text-primary text-xs">✓ Selecionada</Badge>}</div>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{props.technique.description || 'Técnica de personalização'}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <TooltipProvider><Tooltip><TooltipTrigger className="flex items-center gap-1"><Clock className={cn('h-3.5 w-3.5', props.sla.textColor)} /><span className={cn('font-medium', props.sla.textColor)}>{props.technique.estimated_days}d</span><Badge variant="outline" className={cn('text-[10px] h-4', props.sla.textColor)}>{props.sla.label}</Badge></TooltipTrigger><TooltipContent><p>Prazo: {props.technique.estimated_days} dias úteis</p></TooltipContent></Tooltip></TooltipProvider>
                <TooltipProvider><Tooltip><TooltipTrigger className="flex items-center gap-1 text-muted-foreground"><DollarSign className="h-3.5 w-3.5" /><span className="font-mono">{formatCurrency(props.technique.unit_cost)}/un</span></TooltipTrigger><TooltipContent><p>Setup: {formatCurrency(props.technique.setup_cost)}</p><p>Mín: {props.technique.min_quantity} un</p></TooltipContent></Tooltip></TooltipProvider>
                <PopularityBadge score={recommendation.popularityScore} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0"><p className="text-xs text-muted-foreground">Estimativa</p><p className="font-bold text-lg">{formatCurrency(props.estimatedCost)}</p><RecommendationMatch technique={props.technique} /></div>
          </div>
        </div>
        <InlineConfiguration visible={props.showInlineConfig} className="p-4 pt-0 border-t border-border/50 bg-muted/30" settings={props.settings} showColors={props.showColors} showSize={props.showSize} colorOptions={props.colorOptions} sizeOptions={props.sizeOptions} onUpdateSetting={props.onUpdateSetting} />
      </div>
    </motion.div>
  );
}

export function TechniqueCard(props: TechniqueCardProps) {
  const code = techniqueCode(props.technique);
  const viewProps: TechniqueViewProps = {
    ...props,
    style: getTechniqueStyle(code),
    thumbnail: getTechniqueThumbnail(code),
    sla: getSlaInfo(props.technique.estimated_days),
    estimatedCost: props.technique.unit_cost * props.quantity + props.technique.setup_cost,
    showInlineConfig: props.isSelected && hasInlineConfiguration(props.showColors, props.showSize),
  };
  return props.viewMode === 'compact'
    ? <CompactTechniqueCard {...viewProps} />
    : <ExpandedTechniqueCard {...viewProps} />;
}

// Formulário de configuração inline
interface InlineConfigFormProps {
  readonly settings: TechniqueSettings;
  readonly showColors: boolean;
  readonly showSize: boolean;
  readonly colorOptions: ColorOption[];
  readonly sizeOptions: SizeOption[];
  readonly onUpdateSetting: TechniqueCardProps['onUpdateSetting'];
}

function ColorConfiguration(props: Pick<InlineConfigFormProps, 'settings' | 'showColors' | 'colorOptions' | 'onUpdateSetting'>) {
  if (!props.showColors) return null;
  const update = (value: string) => props.onUpdateSetting('colors', parseInt(value) || 1);
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground flex items-center gap-1"><Palette className="h-3 w-3" />Cores</Label>{props.colorOptions.length > 0 ? <Select value={props.settings.colors.toString()} onValueChange={update}><SelectTrigger className="h-9" onClick={event => event.stopPropagation()}><SelectValue /></SelectTrigger><SelectContent>{props.colorOptions.map(option => <SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>)}</SelectContent></Select> : <Input type="number" min={1} max={12} value={props.settings.colors} onChange={event => update(event.target.value)} className="h-9" onClick={event => event.stopPropagation()} />}</div>;
}

function SizeConfiguration(props: Pick<InlineConfigFormProps, 'settings' | 'showSize' | 'sizeOptions' | 'onUpdateSetting'>) {
  if (!props.showSize) return null;
  if (props.sizeOptions.length > 0) return <div className="space-y-1.5 col-span-2"><Label className="text-xs text-muted-foreground flex items-center gap-1"><Ruler className="h-3 w-3" />Tamanho</Label><Select value={`${props.settings.width}x${props.settings.height}`} onValueChange={value => updateSelectedSize(value, props.onUpdateSetting)}><SelectTrigger className="h-9" onClick={event => event.stopPropagation()}><SelectValue /></SelectTrigger><SelectContent>{props.sizeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label} ({option.areaCm2} cm²)</SelectItem>)}</SelectContent></Select></div>;
  return <><div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Largura (cm)</Label><Input type="number" min={1} value={props.settings.width} onChange={event => props.onUpdateSetting('width', parseInt(event.target.value) || 1)} className="h-9" onClick={event => event.stopPropagation()} /></div><div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Altura (cm)</Label><Input type="number" min={1} value={props.settings.height} onChange={event => props.onUpdateSetting('height', parseInt(event.target.value) || 1)} className="h-9" onClick={event => event.stopPropagation()} /></div></>;
}

function PositionConfiguration(props: Pick<InlineConfigFormProps, 'settings' | 'onUpdateSetting'>) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground flex items-center gap-1">Posições<TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger><TooltipContent><p>Locais de gravação</p></TooltipContent></Tooltip></TooltipProvider></Label><Input type="number" min={1} max={10} value={props.settings.positions} onChange={event => props.onUpdateSetting('positions', parseInt(event.target.value) || 1)} className="h-9" onClick={event => event.stopPropagation()} /></div>;
}

function EngravingArea({ visible, settings }: { readonly visible: boolean; readonly settings: TechniqueSettings }) {
  if (!visible) return null;
  return <div className="col-span-full"><p className="text-xs text-muted-foreground">Área: <span className="font-mono font-medium">{settings.width * settings.height} cm²</span></p></div>;
}

function InlineConfigForm(props: InlineConfigFormProps) {
  const customSize = props.showSize && props.sizeOptions.length === 0;
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2"><ColorConfiguration {...props} /><SizeConfiguration {...props} /><PositionConfiguration {...props} /><EngravingArea visible={customSize} settings={props.settings} /></div>;
}
