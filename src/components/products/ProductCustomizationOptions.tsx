/**
 * ProductCustomizationOptions — Seletor de personalização v6
 * 
 * Usa fn_get_product_customization_options para obter locais e técnicas.
 * Fluxo: Local (tabs) → Técnica (cards) → Dimensões/Cores → Preço.
 * 
 * Briefing v6 (12/02/2026).
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Paintbrush } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProductCustomizationOptions } from "@/hooks/useProductCustomizationOptions";
import { LocationPanel } from "./customization/LocationPanel";
import type { CustomizationPriceResponseV6, PersonalizationItem } from "@/types/customization";

interface ProductCustomizationOptionsProps {
  productId: string;
  productSku?: string;
  quantity?: number;
  onSelectionChange?: (personalizations: PersonalizationItem[]) => void;
}

function resolveNumCores(price: CustomizationPriceResponseV6): number {
  return price.num_cores ?? 1;
}

type CustomizationOptions = NonNullable<ReturnType<typeof useProductCustomizationOptions>["data"]>;

function LoadingCustomizationOptions() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

function CustomizationHeader({ count }: { count: number }) {
  return <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"><Paintbrush className="h-4 w-4 text-primary" /></div><h3 className="font-display text-lg font-semibold text-foreground">Personalização</h3></div><Badge variant="secondary" className="text-xs">{count} loca{count !== 1 ? "is" : "l"}</Badge></div>;
}

function LocationTabs({ locations, activeLocation, prices, onSelect }: { locations: CustomizationOptions['locations']; activeLocation: string | null; prices: Map<string, PersonalizationItem>; onSelect: (location: string) => void }) {
  return <div className="flex gap-2 flex-wrap">{locations.map((location) => { const active = activeLocation === location.location_code; const priced = prices.has(location.location_code); return <button key={location.location_code} onClick={() => onSelect(location.location_code)} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all border", active ? "bg-primary text-primary-foreground border-primary" : priced ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80")}>{location.location_name}{priced && !active && <span className="ml-1.5 text-xs">✓</span>}</button>; })}</div>;
}

function CustomizationSummary({ count, total }: { count: number; total: number }) {
  if (count === 0) return <div className="flex items-center justify-center p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">Selecione uma técnica para ver o preço de gravação</div>;
  return <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm"><span className="text-foreground font-medium">{count} loca{count !== 1 ? "is" : "l"} personalizado{count !== 1 ? "s" : ""}</span><span className="text-primary font-semibold">Total gravação: R$ {total.toFixed(2)}</span></div>;
}

function CustomizationContent({
  options,
  activeLocation,
  setActiveLocation,
  prices,
  quantity,
  onPriceCalculated,
}: {
  options: CustomizationOptions;
  activeLocation: string | null;
  setActiveLocation: (location: string) => void;
  prices: Map<string, PersonalizationItem>;
  quantity: number;
  onPriceCalculated: (locationCode: string, techniqueId: string, price: CustomizationPriceResponseV6 | null, dimensions?: { width?: number; height?: number }) => void;
}) {
  const locations = options.locations;
  const currentLocation = locations.find((location) => location.location_code === activeLocation);
  const totalSelected = prices.size;
  const totalPrice = Array.from(prices.values()).reduce((sum, item) => sum + (item.price?.total_cobrado ?? 0), 0);

  return (
    <div className="space-y-4">
      <CustomizationHeader count={locations.length} />
      <LocationTabs locations={locations} activeLocation={activeLocation} prices={prices} onSelect={setActiveLocation} />
      {currentLocation && (
        <LocationPanel key={currentLocation.location_code} location={currentLocation} quantity={quantity} onPriceCalculated={onPriceCalculated} />
      )}
      <CustomizationSummary count={totalSelected} total={totalPrice} />
    </div>
  );
}

function useCustomizationSelection(options: CustomizationOptions | null | undefined, onSelectionChange: ProductCustomizationOptionsProps['onSelectionChange']) {
  const pricesRef = useRef<Map<string, PersonalizationItem>>(new Map());
  const handlePriceCalculated = useCallback((locationCode: string, techniqueId: string, price: CustomizationPriceResponseV6 | null, dimensions?: { width?: number; height?: number }) => {
    const location = options?.locations.find((item) => item.location_code === locationCode);
    const technique = location?.options.find((item) => item.technique_id === techniqueId);
    if (price && technique) {
      pricesRef.current.set(locationCode, { locationCode, locationName: location?.location_name || locationCode, techniqueId, techniqueName: technique.tecnica_nome, codigoTabela: technique.codigo_tabela, grupoTecnica: technique.grupo_tecnica, width: dimensions?.width, height: dimensions?.height, numberOfColors: resolveNumCores(price), usaDimensao: technique.usa_dimensao, price });
    } else pricesRef.current.delete(locationCode);
    onSelectionChange?.(Array.from(pricesRef.current.values()));
  }, [onSelectionChange, options]);
  return { pricesRef, handlePriceCalculated };
}

export function ProductCustomizationOptions({
  productId,
  quantity = 100,
  onSelectionChange,
}: ProductCustomizationOptionsProps) {
  const { data: options, isLoading } = useProductCustomizationOptions(productId);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const { pricesRef, handlePriceCalculated } = useCustomizationSelection(options, onSelectionChange);

  useEffect(() => {
    const firstLocation = options?.locations[0];
    if (firstLocation && !activeLocation) setActiveLocation(firstLocation.location_code);
  }, [activeLocation, options?.locations]);

  if (isLoading) {
    return <LoadingCustomizationOptions />;
  }

  if (!options?.locations?.length) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Este produto não possui opções de personalização configuradas.
      </div>
    );
  }

  return (
    <CustomizationContent
      options={options}
      activeLocation={activeLocation}
      setActiveLocation={setActiveLocation}
      prices={pricesRef.current}
      quantity={quantity}
      onPriceCalculated={handlePriceCalculated}
    />
  );
}
