/**
 * ConfigurationPanel — Etapa 4: Configurar tamanho, cores e calcular preço
 * 
 * Verifica se a tabela de preço usa faixas dimensionais (Laser).
 * Se sim, mostra inputs de largura/altura.
 * Se cobra_por_cor, mostra seletor de cores.
 * Calcula preço somente quando todos os campos obrigatórios estão preenchidos.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Palette, Clock, Ruler, AlertCircle, Check } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { invokeExternalDb } from "@/lib/external-db";
import { invokeExternalRpc } from "@/lib/external-rpc";
import type { PrintAreaV2, CustomizationPriceResponse, CustomizationPriceFlat } from "@/hooks/useGravacaoPriceV2";
import { adaptPriceResponse } from "@/lib/personalization/adapters";

interface ConfigurationPanelProps {
  area: PrintAreaV2;
  quantity: number;
  onPriceCalculated: (areaId: string, priceData: CustomizationPriceFlat | null) => void;
}

interface FaixaDimensional {
  largura_min: number | null;
  largura_max: number | null;
  altura_min: number | null;
  altura_max: number | null;
}

function LegacyDimensions({ area, enabled, width, height, widthNumber, heightNumber, onWidth, onHeight }: { area: PrintAreaV2; enabled: boolean | null; width: string; height: string; widthNumber: number; heightNumber: number; onWidth: (value: string) => void; onHeight: (value: string) => void }) {
  if (!enabled) return null;
  const exceedsLimits = widthNumber > area.max_width || heightNumber > area.max_height;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm text-foreground"><Ruler className="h-3.5 w-3.5" /><span className="font-medium">Tamanho da gravação</span></div>
      <p className="text-xs text-muted-foreground">Informe o tamanho desejado (máx. {area.max_width}×{area.max_height}cm)</p>
      <div className="flex items-center gap-3">
        <div className="flex-1"><Label className="text-xs text-muted-foreground">Largura (cm)</Label><Input type="number" step="0.1" min="0.1" max={area.max_width} value={width} onChange={(event) => onWidth(event.target.value)} placeholder={`até ${area.max_width}`} className="h-9 text-sm" /></div>
        <span className="text-muted-foreground mt-5">×</span>
        <div className="flex-1"><Label className="text-xs text-muted-foreground">Altura (cm)</Label><Input type="number" step="0.1" min="0.1" max={area.max_height} value={height} onChange={(event) => onHeight(event.target.value)} placeholder={`até ${area.max_height}`} className="h-9 text-sm" /></div>
      </div>
      {exceedsLimits && <div className="flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="h-3 w-3" />Excede o limite da área ({area.max_width}×{area.max_height}cm)</div>}
    </div>
  );
}

function LegacyColors({ area, selected, onSelect }: { area: PrintAreaV2; selected: number; onSelect: (value: number) => void }) {
  const maxColors = area.max_colors ?? 1;
  if (!area.cobra_por_cor) return <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Palette className="h-3 w-3" />{maxColors === 1 ? "1 cor (fixa)" : "Full Color — sem limite de cores"}</div>;
  if (maxColors <= 1) return null;
  return <div className="space-y-2"><div className="flex items-center gap-1.5 text-sm text-foreground"><Palette className="h-3.5 w-3.5" /><span className="font-medium">Nº de cores</span></div><div className="flex gap-1.5">{Array.from({ length: maxColors }, (_, index) => index + 1).map((count) => <button key={count} className={cn("w-9 h-9 rounded-md text-sm font-medium transition-colors", count === selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")} onClick={() => onSelect(count)}>{count}</button>)}</div></div>;
}

function RedirectNotice({ price }: { price: CustomizationPriceFlat }) {
  if (!price.redirected_from || !price.redirected_to) return null;
  return <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 p-2 rounded-md border border-warning/20"><AlertCircle className="h-3 w-3 flex-shrink-0" /><span>Redirecionado automaticamente: as dimensões excedem o limite da técnica original. Usando <strong>{price.technique}</strong> (compatível com o formato do produto).</span></div>;
}

function LegacyPriceResult({ price, usesDimensions, width, height, quantity }: { price: CustomizationPriceFlat; usesDimensions: boolean | null; width: number; height: number; quantity: number }) {
  return (
    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
      <RedirectNotice price={price} />
      <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-foreground">{price.technique}</span></div>
      <div className="text-xs text-muted-foreground space-y-0.5">{usesDimensions && width > 0 && height > 0 && <p>Gravação: {width} × {height} cm</p>}<p>Quantidade: {quantity} peças</p>{price.num_cores > 1 && <p>Cores: {price.num_cores}</p>}</div>
      <div className="border-t border-border/50 pt-2 space-y-1"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Preço unitário:</span><span className="font-semibold text-primary">R$ {price.unit_price?.toFixed(2)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal gravação:</span><span className="font-medium text-foreground">R$ {price.total_price?.toFixed(2)}</span></div>{price.minimum_applied && <div className="flex items-center gap-1.5 text-xs text-warning"><AlertCircle className="h-3 w-3" />Faturamento mínimo aplicado</div>}{price.production_days && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />Prazo: {price.production_days} dias úteis</div>}</div>
    </div>
  );
}

function LegacyPriceState({ loading, error, price, canCalculate, usesDimensions, width, height, quantity }: { loading: boolean; error: string | null; price: CustomizationPriceFlat | null; canCalculate: boolean; usesDimensions: boolean | null; width: number; height: number; quantity: number }) {
  if (loading) return <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Calculando preço...</div>;
  if (error) return <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"><AlertCircle className="h-3.5 w-3.5" />{error}</div>;
  if (price) return <LegacyPriceResult price={price} usesDimensions={usesDimensions} width={width} height={height} quantity={quantity} />;
  if (canCalculate) return null;
  return <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground text-center">{usesDimensions ? "Preencha largura e altura para calcular o preço" : "Aguardando configuração..."}</div>;
}

function useDimensionConfiguration(area: PrintAreaV2) {
  const [usesDimensions, setUsesDimensions] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [colorCount, setColorCount] = useState(1);
  useEffect(() => {
    let cancelled = false;
    setChecking(true); setUsesDimensions(null); setWidth(""); setHeight(""); setColorCount(1);
    void (async () => {
      try {
        if (!area.customization_price_table_id) { setUsesDimensions(false); return; }
        const result = await invokeExternalDb<FaixaDimensional>({ table: "tabela_preco_gravacao_oficial_faixa", operation: "select", select: "largura_min, largura_max, altura_min, altura_max", filters: { tabela_preco_gravacao_id: area.customization_price_table_id }, limit: 1 });
        if (!cancelled) setUsesDimensions(Boolean(result.records?.[0]?.largura_min !== null && result.records?.[0]));
      } catch { if (!cancelled) setUsesDimensions(false); }
      finally { if (!cancelled) setChecking(false); }
    })();
    return () => { cancelled = true; };
  }, [area.area_id, area.customization_price_table_id]);
  return { usesDimensions, checking, width, setWidth, height, setHeight, colorCount, setColorCount, widthNumber: parseFloat(width) || 0, heightNumber: parseFloat(height) || 0 };
}

function canCalculatePrice(area: PrintAreaV2, quantity: number, dimensions: ReturnType<typeof useDimensionConfiguration>) {
  if (quantity <= 0 || dimensions.usesDimensions === null) return false;
  if (!dimensions.usesDimensions) return true;
  return dimensions.widthNumber > 0 && dimensions.heightNumber > 0 && dimensions.widthNumber <= area.max_width && dimensions.heightNumber <= area.max_height;
}

function useCustomizationPrice(area: PrintAreaV2, quantity: number, dimensions: ReturnType<typeof useDimensionConfiguration>, onPriceCalculated: ConfigurationPanelProps["onPriceCalculated"]) {
  const [price, setPrice] = useState<CustomizationPriceFlat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCalculate = canCalculatePrice(area, quantity, dimensions);
  const calculate = useCallback(async () => {
    if (!canCalculate) return;
    setLoading(true); setError(null);
    try {
      const result = await invokeExternalRpc<CustomizationPriceResponse>("fn_get_customization_price", { p_area_id: area.area_id, p_quantidade: quantity, p_num_cores: dimensions.colorCount, p_largura_cm: dimensions.usesDimensions ? dimensions.widthNumber : null, p_altura_cm: dimensions.usesDimensions ? dimensions.heightNumber : null });
      if (!result?.success) { setPrice(null); setError("Erro no cálculo de preço"); onPriceCalculated(area.area_id, null); return; }
      const flat = adaptPriceResponse(result as unknown as Record<string, unknown>);
      setPrice(flat); onPriceCalculated(area.area_id, flat);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Erro ao calcular preço"); setPrice(null); onPriceCalculated(area.area_id, null); }
    finally { setLoading(false); }
  }, [canCalculate, area.area_id, quantity, dimensions.colorCount, dimensions.usesDimensions, dimensions.widthNumber, dimensions.heightNumber, onPriceCalculated]);
  const calculateRef = useRef(calculate); calculateRef.current = calculate;
  const callbackRef = useRef(onPriceCalculated); callbackRef.current = onPriceCalculated;
  useEffect(() => {
    if (canCalculate) { const timer = setTimeout(() => calculateRef.current(), 400); return () => clearTimeout(timer); }
    setPrice(null); callbackRef.current(area.area_id, null);
  }, [canCalculate, dimensions.colorCount, dimensions.widthNumber, dimensions.heightNumber, quantity, area.area_id]);
  return { price, loading, error, canCalculate };
}

export function ConfigurationPanel({ area, quantity, onPriceCalculated }: ConfigurationPanelProps) {
  const dimensions = useDimensionConfiguration(area);
  const pricing = useCustomizationPrice(area, quantity, dimensions, onPriceCalculated);
  if (dimensions.checking) return <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando configuração...</div>;

  return (
    <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Etapa 4 · Configure a gravação
      </p>

      <LegacyDimensions area={area} enabled={dimensions.usesDimensions} width={dimensions.width} height={dimensions.height} widthNumber={dimensions.widthNumber} heightNumber={dimensions.heightNumber} onWidth={dimensions.setWidth} onHeight={dimensions.setHeight} />
      <LegacyColors area={area} selected={dimensions.colorCount} onSelect={dimensions.setColorCount} />
      <LegacyPriceState loading={pricing.loading} error={pricing.error} price={pricing.price} canCalculate={pricing.canCalculate} usesDimensions={dimensions.usesDimensions} width={dimensions.widthNumber} height={dimensions.heightNumber} quantity={quantity} />
    </div>
  );
}
