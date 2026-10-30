/**
 * ConfigurationPanelV6 — Dimensões + Cores + Preço
 * 
 * Mostra inputs condicionais baseado em usa_dimensao e cobra_por_cor.
 * Calcula preço via fn_get_customization_price com debounce.
 * Briefing v6 (12/02/2026).
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Loader2, Palette, Ruler, AlertCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCustomizationPriceReactive } from "@/hooks/useCustomizationPrice";
import type { TechniqueOption, CustomizationPriceResponseV6 } from "@/types/customization";

interface ConfigurationPanelV6Props {
  technique: TechniqueOption;
  quantity: number;
  onPriceCalculated: (techniqueId: string, price: CustomizationPriceResponseV6 | null, dimensions?: { width?: number; height?: number }) => void;
}

function DimensionFields({ technique, width, height, error, onWidth, onHeight }: { technique: TechniqueOption; width: string; height: string; error: string | null; onWidth: (value: string) => void; onHeight: (value: string) => void }) {
  if (!technique.usa_dimensao) return null;
  const showError = Boolean(error) && Number(width) > 0 && Number(height) > 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm text-foreground"><Ruler className="h-3.5 w-3.5" /><span className="font-medium">Tamanho da gravação</span></div>
      <p className="text-xs text-muted-foreground">Máx. {technique.efetiva_largura_max} × {technique.efetiva_altura_max} cm</p>
      <div className="flex items-center gap-3">
        <div className="flex-1"><Label className="text-xs text-muted-foreground">Largura (cm)</Label><Input type="number" step="0.1" min="0.1" max={technique.efetiva_largura_max} value={width} onChange={(event) => onWidth(event.target.value)} placeholder={`até ${technique.efetiva_largura_max}`} className="h-9 text-sm" /></div>
        <span className="text-muted-foreground mt-5">×</span>
        <div className="flex-1"><Label className="text-xs text-muted-foreground">Altura (cm)</Label><Input type="number" step="0.1" min="0.1" max={technique.efetiva_altura_max} value={height} onChange={(event) => onHeight(event.target.value)} placeholder={`até ${technique.efetiva_altura_max}`} className="h-9 text-sm" /></div>
      </div>
      {showError && <div className="flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="h-3 w-3" />{error}</div>}
    </div>
  );
}

function colorButtonLabel(colorCount: number) {
  const label = `${colorCount} ${colorCount === 1 ? "cor" : "cores"}`;
  if (colorCount === 2) return `${label} (-10%)`;
  return colorCount === 3 ? `${label} (-15%)` : label;
}

function ColorFields({ technique, selected, onSelect }: { technique: TechniqueOption; selected: number; onSelect: (value: number) => void }) {
  if (!technique.cobra_por_cor) return <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Palette className="h-3 w-3" />Full Color — sem limite de cores</div>;
  if (technique.max_cores <= 1) return null;
  return (
    <div className="space-y-2"><div className="flex items-center gap-1.5 text-sm text-foreground"><Palette className="h-3.5 w-3.5" /><span className="font-medium">Nº de cores</span></div><div className="flex gap-1.5">{Array.from({ length: technique.max_cores }, (_, index) => index + 1).map((count) => <button key={count} className={cn("px-3 h-9 rounded-md text-sm font-medium transition-colors", count === selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")} onClick={() => onSelect(count)}>{colorButtonLabel(count)}</button>)}</div></div>
  );
}

function PriceMetadata({ price, technique, width, height }: { price: CustomizationPriceResponseV6; technique: TechniqueOption; width: number; height: number }) {
  const numberOfColors = price.num_cores ?? 0;
  return (
    <div className="text-xs text-muted-foreground space-y-0.5">
      {technique.usa_dimensao && width > 0 && height > 0 && <p>Gravação: {width} × {height} cm</p>}
      <p>Quantidade: {price.quantidade} peças</p>
      {price.faixa && <p>Faixa: {price.faixa.qtd_min} a {price.faixa.qtd_max} peças</p>}
      {numberOfColors > 1 && <p>Cores: {numberOfColors}</p>}
    </div>
  );
}

function PriceBreakdown({ price }: { price: CustomizationPriceResponseV6 }) {
  const unitPrice = price.preco_unitario ?? 0;
  const engravingPrice = price.valor_gravacao ?? 0;
  const setupTotal = price.setup_total ?? 0;
  const total = price.total_cobrado ?? 0;
  return (
    <div className="border-t border-border/50 pt-2 space-y-1">
      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Preço unitário:</span><span className="font-semibold text-primary">R$ {unitPrice.toFixed(2)}</span></div>
      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gravação ({price.quantidade}×):</span><span className="font-medium text-foreground">R$ {engravingPrice.toFixed(2)}</span></div>
      {setupTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Setup:</span><span className="font-medium text-foreground">R$ {setupTotal.toFixed(2)}</span></div>}
      <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-1"><span className="text-foreground">TOTAL:</span><span className="text-primary">R$ {total.toFixed(2)}</span></div>
    </div>
  );
}

function PriceResult({ price, technique, width, height }: { price: CustomizationPriceResponseV6; technique: TechniqueOption; width: number; height: number }) {
  return (
    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
      <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-foreground">{price.nome_tabela}</span></div>
      <PriceMetadata price={price} technique={technique} width={width} height={height} />
      <PriceBreakdown price={price} />
    </div>
  );
}

function PriceState({ price, loading, error, technique, width, height }: { price: CustomizationPriceResponseV6 | null; loading: boolean; error: string | null; technique: TechniqueOption; width: number; height: number }) {
  if (loading) return <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Calculando preço...</div>;
  if (error) return <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"><AlertCircle className="h-3.5 w-3.5" />{error}</div>;
  if (price) return <PriceResult price={price} technique={technique} width={width} height={height} />;
  const waiting = technique.usa_dimensao && (width <= 0 || height <= 0) ? "Preencha largura e altura para calcular o preço" : "Aguardando cálculo...";
  return <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground text-center">{waiting}</div>;
}

function validateDimensions(technique: TechniqueOption, width: number, height: number) {
  if (!technique.usa_dimensao) return null;
  if (width <= 0 || height <= 0) return "Preencha largura e altura";
  if (width > technique.efetiva_largura_max) return `Largura máxima: ${technique.efetiva_largura_max} cm`;
  if (height > technique.efetiva_altura_max) return `Altura máxima: ${technique.efetiva_altura_max} cm`;
  return null;
}

export function ConfigurationPanelV6({ technique, quantity, onPriceCalculated }: ConfigurationPanelV6Props) {
  // Dimensions
  const [largura, setLargura] = useState<string>(
    technique.usa_dimensao ? String(technique.efetiva_largura_max) : ""
  );
  const [altura, setAltura] = useState<string>(
    technique.usa_dimensao ? String(technique.efetiva_altura_max) : ""
  );

  // Colors
  const [numCores, setNumCores] = useState(1);

  const larguraNum = parseFloat(largura) || 0;
  const alturaNum = parseFloat(altura) || 0;

  // Validation
  const dimensionError = useMemo(() => validateDimensions(technique, larguraNum, alturaNum), [technique, larguraNum, alturaNum]);

  // Reactive price calculation with debounce
  const { price, loading, error } = useCustomizationPriceReactive(
    technique.technique_id,
    quantity,
    technique.cobra_por_cor ? numCores : 1,
    technique.usa_dimensao ? larguraNum : null,
    technique.usa_dimensao ? alturaNum : null,
    technique.usa_dimensao,
  );

  const onPriceCalculatedRef = useRef(onPriceCalculated);
  onPriceCalculatedRef.current = onPriceCalculated;

  // Notify parent when price or dimensions change
  useEffect(() => {
    const dims = technique.usa_dimensao ? { width: larguraNum, height: alturaNum } : undefined;
    onPriceCalculatedRef.current(technique.technique_id, price, dims);
  }, [price, technique.technique_id, technique.usa_dimensao, larguraNum, alturaNum]);

  return (
    <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Configure a gravação
      </p>

      <DimensionFields technique={technique} width={largura} height={altura} error={dimensionError} onWidth={setLargura} onHeight={setAltura} />
      <ColorFields technique={technique} selected={numCores} onSelect={setNumCores} />
      <PriceState price={price} loading={loading} error={error} technique={technique} width={larguraNum} height={alturaNum} />
    </div>
  );
}
