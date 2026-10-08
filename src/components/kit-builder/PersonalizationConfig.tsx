/**
 * Personalization Config
 * Configuração de personalização para caixa e itens
 * Integrado com técnicas reais do banco externo via useProductCustomizationOptions
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Palette, Package, ChevronDown, ChevronUp, Check, Settings, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency, type KitBox, type KitItem, type KitItemPersonalization } from '@/lib/kit-builder';
import { useProductCustomizationOptions } from '@/hooks/useProductCustomizationOptions';
import { useCustomizationPriceReactive } from '@/hooks/useCustomizationPrice';
import type { GravacaoLocation } from '@/types/customization';

interface PersonalizationConfigProps {
  box: KitBox | null;
  items: KitItem[];
  kitQuantity?: number;
  boxPersonalization: KitItemPersonalization;
  itemPersonalizations: Record<string, KitItemPersonalization>;
  onBoxPersonalizationChange: (config: KitItemPersonalization) => void;
  onItemPersonalizationChange: (itemId: string, config: KitItemPersonalization) => void;
}

/** Flattened technique with location info */
interface FlatTechnique {
  technique_id: string;
  tecnica_nome: string;
  grupo_tecnica: string;
  codigo_tabela: string;
  location_name: string;
  location_code: string;
  max_cores: number;
  usa_dimensao: boolean;
  efetiva_largura_max: number;
  efetiva_altura_max: number;
}

function flattenTechniques(locations: GravacaoLocation[]): FlatTechnique[] {
  const result: FlatTechnique[] = [];
  for (const loc of locations) {
    for (const tech of loc.options) {
      result.push({
        technique_id: tech.technique_id,
        tecnica_nome: tech.tecnica_nome,
        grupo_tecnica: tech.grupo_tecnica,
        codigo_tabela: tech.codigo_tabela,
        location_name: loc.location_name,
        location_code: loc.location_code,
        max_cores: tech.max_cores,
        usa_dimensao: tech.usa_dimensao,
        efetiva_largura_max: tech.efetiva_largura_max,
        efetiva_altura_max: tech.efetiva_altura_max,
      });
    }
  }
  return result;
}

// ============================================
// Card de personalização — busca técnicas internamente
// ============================================

interface ItemPersonalizationCardProps {
  productId: string;
  displayName: string;
  imageUrl: string | null;
  personalization: KitItemPersonalization;
  onChange: (config: KitItemPersonalization) => void;
  isBox?: boolean;
  kitQuantity: number;
}

type PriceData = ReturnType<typeof useCustomizationPriceReactive>['price'];

function resolveDimension(current: number | undefined, usesDimension: boolean, maximum: number): number | undefined {
  if (current) return current;
  if (usesDimension) return maximum;
  return undefined;
}

function buildTechniqueConfig(personalization: KitItemPersonalization, technique: FlatTechnique): KitItemPersonalization {
  return {
    ...personalization,
    techniqueId: technique.technique_id,
    techniqueName: technique.tecnica_nome,
    techniqueCode: technique.codigo_tabela,
    position: technique.location_name,
    colors: Math.min(personalization.colors || 1, technique.max_cores),
    width: resolveDimension(personalization.width, technique.usa_dimensao, technique.efetiva_largura_max),
    height: resolveDimension(personalization.height, technique.usa_dimensao, technique.efetiva_altura_max),
    estimatedPrice: undefined,
  };
}

function PersonalizationThumbnail({ imageUrl, displayName, isBox }: { imageUrl: string | null; displayName: string; isBox: boolean }) {
  if (imageUrl) return <img src={imageUrl} alt={displayName} className="w-full h-full object-cover" loading="lazy" />;
  return <div className="w-full h-full flex items-center justify-center">{isBox ? <Package className="h-5 w-5 text-muted-foreground" /> : <Palette className="h-5 w-5 text-muted-foreground" />}</div>;
}

function PersonalizationPrice({ personalization, loading, unitPrice }: { personalization: KitItemPersonalization; loading: boolean; unitPrice?: number | null }) {
  if (!personalization.enabled) return null;
  if (loading) return <span className="text-sm font-semibold"><Loader2 className="h-3 w-3 animate-spin inline text-primary" /></span>;
  if (!personalization.techniqueId) return <span className="text-sm font-semibold text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Sem técnica</span>;
  if (unitPrice) return <span className="text-sm font-semibold text-primary">+{formatCurrency(unitPrice)}/un</span>;
  return <span className="text-sm font-semibold text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" />R$ 0,00</span>;
}

function PersonalizationCardHeader({ displayName, imageUrl, personalization, isBox, isOpen, priceLoading, currentUnitPrice, onToggle }: { displayName: string; imageUrl: string | null; personalization: KitItemPersonalization; isBox: boolean; isOpen: boolean; priceLoading: boolean; currentUnitPrice?: number | null; onToggle: (enabled: boolean) => void }) {
  return <CardHeader className="pb-3"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-md bg-secondary overflow-hidden flex-shrink-0"><PersonalizationThumbnail imageUrl={imageUrl} displayName={displayName} isBox={isBox} /></div><div><CardTitle className="text-base flex items-center gap-2">{displayName}{isBox && <Badge variant="outline" className="text-xs">Caixa</Badge>}</CardTitle>{personalization.enabled && personalization.techniqueName && <p className="text-xs text-muted-foreground mt-0.5">{personalization.techniqueName} • {personalization.colors || 1} cor(es){personalization.position && ` • ${personalization.position}`}</p>}</div></div><div className="flex items-center gap-3"><PersonalizationPrice personalization={personalization} loading={priceLoading} unitPrice={currentUnitPrice} /><Switch checked={personalization.enabled} onCheckedChange={onToggle} />{personalization.enabled && <CollapsibleTrigger asChild><Button variant="ghost" size="icon" aria-label="Expandir" className="h-8 w-8">{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></CollapsibleTrigger>}</div></div></CardHeader>;
}

function TechniqueField({ techniques, loading, personalization, onChange }: { techniques: FlatTechnique[]; loading: boolean; personalization: KitItemPersonalization; onChange: (id: string) => void }) {
  if (loading) return <div className="space-y-2"><Label>Técnica de Gravação</Label><div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-secondary/50"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm text-muted-foreground">Carregando...</span></div></div>;
  if (techniques.length === 0) return <div className="space-y-2"><Label>Técnica de Gravação</Label><p className="text-sm text-muted-foreground py-2">Nenhuma técnica disponível para este produto</p></div>;
  return <div className="space-y-2"><Label>Técnica de Gravação</Label><Select value={personalization.techniqueId || ''} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Selecione a técnica..." /></SelectTrigger><SelectContent>{techniques.map(technique => <SelectItem key={technique.technique_id} value={technique.technique_id}><span className="flex items-center gap-2"><Badge variant="outline" className="text-[10px] px-1 py-0">{technique.grupo_tecnica}</Badge>{technique.tecnica_nome}<span className="text-muted-foreground text-xs">({technique.location_name})</span></span></SelectItem>)}</SelectContent></Select></div>;
}

function ColorCountField({ colors, maxColors, onChange }: { colors: number; maxColors: number; onChange: (colors: number) => void }) {
  const options = Array.from({ length: maxColors }, (_, index) => index + 1);
  return <div className="space-y-2"><Label>Número de Cores</Label><Select value={String(colors)} onValueChange={value => onChange(parseInt(value))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map(count => <SelectItem key={count} value={String(count)}>{count} {count === 1 ? 'cor' : 'cores'}</SelectItem>)}</SelectContent></Select></div>;
}

function DimensionFields({ technique, personalization, onChange }: { technique?: FlatTechnique; personalization: KitItemPersonalization; onChange: (config: KitItemPersonalization) => void }) {
  if (!technique?.usa_dimensao) return null;
  const updateDimension = (field: 'width' | 'height', value: string, maximum: number) => onChange({ ...personalization, [field]: value ? Math.min(parseFloat(value), maximum) : undefined });
  return <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Largura (cm) <span className="text-xs text-muted-foreground">máx {technique.efetiva_largura_max}</span></Label><Input type="number" step="0.1" max={technique.efetiva_largura_max} placeholder={`Até ${technique.efetiva_largura_max}cm`} value={personalization.width || ''} onChange={event => updateDimension('width', event.target.value, technique.efetiva_largura_max)} /></div><div className="space-y-2"><Label>Altura (cm) <span className="text-xs text-muted-foreground">máx {technique.efetiva_altura_max}</span></Label><Input type="number" step="0.1" max={technique.efetiva_altura_max} placeholder={`Até ${technique.efetiva_altura_max}cm`} value={personalization.height || ''} onChange={event => updateDimension('height', event.target.value, technique.efetiva_altura_max)} /></div></div>;
}

function PriceDetails({ priceData, kitQuantity }: { priceData: PriceData; kitQuantity: number }) {
  if (!priceData?.success) return null;
  return <div className="bg-secondary/50 rounded-lg p-3 space-y-1 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Preço unitário</span><span>{formatCurrency(priceData.preco_unitario)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Gravação ({kitQuantity}un)</span><span>{formatCurrency(priceData.valor_gravacao)}</span></div>{(priceData.setup_total ?? 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Setup</span><span>{formatCurrency(priceData.setup_total ?? 0)}</span></div>}<div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total gravação</span><span className="text-primary">{formatCurrency(priceData.total_cobrado)}</span></div></div>;
}

function PersonalizationForm({ techniques, loading, personalization, currentTech, priceData, kitQuantity, onChange, onTechniqueChange }: { techniques: FlatTechnique[]; loading: boolean; personalization: KitItemPersonalization; currentTech?: FlatTechnique; priceData: PriceData; kitQuantity: number; onChange: (config: KitItemPersonalization) => void; onTechniqueChange: (id: string) => void }) {
  return <CollapsibleContent><CardContent className="pt-0 space-y-4"><div className="grid grid-cols-2 gap-4"><TechniqueField techniques={techniques} loading={loading} personalization={personalization} onChange={onTechniqueChange} /><ColorCountField colors={personalization.colors || 1} maxColors={currentTech?.max_cores || 6} onChange={colors => onChange({ ...personalization, colors })} /></div><DimensionFields technique={currentTech} personalization={personalization} onChange={onChange} /><PriceDetails priceData={priceData} kitQuantity={kitQuantity} /></CardContent></CollapsibleContent>;
}

function getPricingArguments(personalization: KitItemPersonalization, technique: FlatTechnique | undefined, quantity: number): Parameters<typeof useCustomizationPriceReactive> {
  return [
    personalization.enabled ? personalization.techniqueId || null : null,
    quantity,
    personalization.colors || 1,
    personalization.width || null,
    personalization.height || null,
    technique?.usa_dimensao || false,
  ];
}

function ItemPersonalizationCard({ productId, displayName, imageUrl, personalization, onChange, isBox = false, kitQuantity }: ItemPersonalizationCardProps) {
  const [isOpen, setIsOpen] = useState(personalization.enabled);
  const { data: options, isLoading: loadingTechniques } = useProductCustomizationOptions(productId);
  const techniques = useMemo(() => options?.locations ? flattenTechniques(options.locations) : [], [options]);
  const currentTech = techniques.find(technique => technique.technique_id === personalization.techniqueId);
  const pricingArguments = getPricingArguments(personalization, currentTech, kitQuantity);
  const { price: priceData, loading: priceLoading } = useCustomizationPriceReactive(...pricingArguments);
  const currentUnitPrice = priceData?.preco_unitario ?? personalization.estimatedPrice;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (priceData?.success && priceData.preco_unitario !== null && priceData.preco_unitario !== undefined) {
      onChangeRef.current({ ...personalization, estimatedPrice: priceData.preco_unitario });
    }
  }, [priceData?.preco_unitario, priceData?.success, personalization]);
  const handleToggle = (enabled: boolean) => {
    onChange({ ...personalization, enabled, estimatedPrice: enabled ? personalization.estimatedPrice : undefined });
    setIsOpen(enabled);
  };
  const handleTechniqueChange = (techniqueId: string) => {
    const technique = techniques.find(item => item.technique_id === techniqueId);
    if (technique) onChange(buildTechniqueConfig(personalization, technique));
  };
  return (
    <Card className={cn(personalization.enabled && "border-primary/50 bg-primary/5")}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <PersonalizationCardHeader displayName={displayName} imageUrl={imageUrl} personalization={personalization} isBox={isBox} isOpen={isOpen} priceLoading={priceLoading} currentUnitPrice={currentUnitPrice} onToggle={handleToggle} />
        <PersonalizationForm techniques={techniques} loading={loadingTechniques} personalization={personalization} currentTech={currentTech} priceData={priceData} kitQuantity={kitQuantity} onChange={onChange} onTechniqueChange={handleTechniqueChange} />
      </Collapsible>
    </Card>
  );
}

// ============================================
// Componente principal
// ============================================

function PersonalizationHeader({ total }: { total: number }) {
  return <div className="flex items-center justify-between"><div><h3 className="font-display text-lg font-semibold flex items-center gap-2"><Settings className="h-5 w-5" />Configurar Personalização</h3><p className="text-sm text-muted-foreground">Escolha quais itens serão personalizados e configure a técnica de gravação</p></div>{total > 0 && <Badge variant="default" className="text-sm"><Check className="h-3 w-3 mr-1" />{total} {total === 1 ? 'item' : 'itens'} personalizado(s)</Badge>}</div>;
}

function MinimumQuantityAlert({ quantity, total }: { quantity: number; total: number }) {
  if (quantity >= 50 || total === 0) return null;
  return <div className="flex items-center gap-2.5 text-sm bg-warning/10 border border-warning/20 rounded-lg p-3"><AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" /><div><p className="font-medium text-warning">Quantidade baixa para personalização</p><p className="text-xs text-muted-foreground">A maioria das técnicas de gravação exige lote mínimo de 50 unidades. Com {quantity} {quantity === 1 ? 'kit' : 'kits'}, o custo por unidade pode ser significativamente maior.</p></div></div>;
}

function BoxPersonalization({ box, personalization, quantity, onChange }: { box: KitBox | null; personalization: KitItemPersonalization; quantity: number; onChange: (config: KitItemPersonalization) => void }) {
  if (!box) return null;
  return <div className="space-y-2"><h4 className="text-sm font-medium text-muted-foreground">Embalagem</h4><ItemPersonalizationCard productId={box.id} displayName={box.name} imageUrl={box.imageUrl} personalization={personalization} onChange={onChange} isBox kitQuantity={quantity} /></div>;
}

function ItemsPersonalization({ items, personalizations, quantity, onChange }: { items: KitItem[]; personalizations: Record<string, KitItemPersonalization>; quantity: number; onChange: (id: string, config: KitItemPersonalization) => void }) {
  if (items.length === 0) return null;
  return <div className="space-y-2"><h4 className="text-sm font-medium text-muted-foreground">Itens do Kit ({items.length})</h4><div className="space-y-3">{items.map(item => <ItemPersonalizationCard key={item.id} productId={item.id} displayName={item.name} imageUrl={item.imageUrl} personalization={personalizations[item.id] || { enabled: false }} onChange={config => onChange(item.id, config)} kitQuantity={quantity} />)}</div></div>;
}

function EmptyPersonalization({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <div className="text-center py-12 text-muted-foreground"><Palette className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>Selecione uma caixa e itens para configurar a personalização</p></div>;
}

export function PersonalizationConfig({
  box,
  items,
  kitQuantity = 100,
  boxPersonalization,
  itemPersonalizations,
  onBoxPersonalizationChange,
  onItemPersonalizationChange,
}: PersonalizationConfigProps) {
  const totalPersonalizations = (boxPersonalization.enabled ? 1 : 0) +
    Object.values(itemPersonalizations).filter(p => p.enabled).length;

  return (
    <div className="space-y-6">
      <PersonalizationHeader total={totalPersonalizations} />
      <MinimumQuantityAlert quantity={kitQuantity} total={totalPersonalizations} />
      <BoxPersonalization box={box} personalization={boxPersonalization} quantity={kitQuantity} onChange={onBoxPersonalizationChange} />
      <ItemsPersonalization items={items} personalizations={itemPersonalizations} quantity={kitQuantity} onChange={onItemPersonalizationChange} />
      <EmptyPersonalization visible={items.length === 0 && !box} />
    </div>
  );
}
