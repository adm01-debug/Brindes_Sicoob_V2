/**
 * InlinePriceCalculator — Refactored orchestrator
 * Table + Calculator extracted to sub-components.
 */
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { invokeExternalDb } from "@/lib/external-db";
import { PriceTiersTable } from "./inline-price/PriceTiersTable";
import { QuantityCalculator } from "./inline-price/QuantityCalculator";

interface PriceTableRow {
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number;
}

interface SupplierSourcePricing {
  id: string;
  cost_price?: number | null;
  cost_price_1?: number | null;
  cost_price_2?: number | null;
  cost_price_3?: number | null;
  cost_price_4?: number | null;
  cost_price_5?: number | null;
  min_qty_1?: number | null;
  min_qty_2?: number | null;
  min_qty_3?: number | null;
  min_qty_4?: number | null;
  min_qty_5?: number | null;
}

interface InlinePriceCalculatorProps {
  productId?: string;
  variantId?: string;
  basePrice: number;
  minQuantity?: number;
  productName: string;
  className?: string;
  defaultOpen?: boolean;
}

function priceTier(source: SupplierSourcePricing, index: number, markupRatio: number): PriceTableRow | null {
  const costPrice = source[`cost_price_${index}` as keyof SupplierSourcePricing] as number | null | undefined;
  const minimumQuantity = source[`min_qty_${index}` as keyof SupplierSourcePricing] as number | null | undefined;
  if (!costPrice || costPrice <= 0) return null;

  const quantity = minimumQuantity && minimumQuantity > 0 ? minimumQuantity : index === 1 ? 1 : index * 50;
  const unitPrice = Number((costPrice * markupRatio).toFixed(2));
  return { quantity, unitPrice, total: Number((unitPrice * quantity).toFixed(2)), discount: 0 };
}

function addTierDiscount(tier: PriceTableRow, referencePrice: number, index: number) {
  tier.discount = index === 0 || referencePrice <= 0
    ? 0
    : Math.max(0, Math.round((1 - tier.unitPrice / referencePrice) * 100));
}

const extractPriceTiersFromSource = (source: SupplierSourcePricing, basePrice: number): PriceTableRow[] => {
  const tiers: PriceTableRow[] = [];
  const baseCost = source.cost_price_1 ?? source.cost_price ?? null;
  const markupRatio = baseCost && baseCost > 0 ? basePrice / baseCost : 1;

  for (let index = 1; index <= 5; index++) {
    const tier = priceTier(source, index, markupRatio);
    if (tier) tiers.push(tier);
  }
  tiers.sort((a, b) => a.quantity - b.quantity);
  const refPrice = tiers[0]?.unitPrice ?? basePrice;
  tiers.forEach((tier, index) => addTierDiscount(tier, refPrice, index));
  return tiers;
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

function useSupplierPriceTiers(productId: string | undefined, variantId: string | undefined, basePrice: number) {
  const [priceTiers, setPriceTiers] = useState<PriceTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    async function fetchPriceTiers() {
      if (!productId) { setPriceTiers([]); return; }
      setIsLoading(true);
      try {
        const variantFilters: Record<string, unknown> = { product_id: productId, is_active: true };
        if (variantId) variantFilters.id = variantId;
        const variantResponse = await invokeExternalDb<{ id: string }>({ table: "product_variants", operation: "select", select: "id", filters: variantFilters, range: [0, 1] });
        const targetVariant = variantResponse?.records?.[0];
        if (!targetVariant) { setPriceTiers([]); return; }
        const response = await invokeExternalDb({ table: "variant_supplier_sources", operation: "select", select: "id,cost_price,cost_price_1,cost_price_2,cost_price_3,cost_price_4,cost_price_5,min_qty_1,min_qty_2,min_qty_3,min_qty_4,min_qty_5", filters: { variant_id: targetVariant.id, is_active: true, is_preferred: true }, range: [0, 1] });
        const source = response?.records?.[0] as SupplierSourcePricing | undefined;
        setPriceTiers(source ? extractPriceTiersFromSource(source, basePrice) : []);
      } catch (error) {
        console.error("Error fetching price tiers:", error); setPriceTiers([]);
      } finally { setIsLoading(false); }
    }
    fetchPriceTiers();
  }, [basePrice, productId, variantId]);
  return { priceTiers, isLoading };
}

export function InlinePriceCalculator({ productId, variantId, basePrice, minQuantity = 1, productName: _productName, className, defaultOpen = false }: InlinePriceCalculatorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen); const [customQuantity, setCustomQuantity] = useState<number>(minQuantity);
  const { priceTiers, isLoading } = useSupplierPriceTiers(productId, variantId, basePrice);

  const getCustomPrice = (qty: number) => {
    if (priceTiers.length === 0) return { unitPrice: basePrice, discount: 0 };
    const tier = [...priceTiers].reverse().find(t => qty >= t.quantity);
    return tier ? { unitPrice: tier.unitPrice, discount: tier.discount || 0 } : { unitPrice: priceTiers[0]?.unitPrice || basePrice, discount: 0 };
  };

  const customPriceInfo = getCustomPrice(customQuantity); const customTotal = customPriceInfo.unitPrice * customQuantity;

  if (defaultOpen) {
    return (
      <div className={cn("space-y-5", className)}>
        <div className="overflow-hidden rounded-xl border border-border/40">
          <PriceTiersTable tiers={priceTiers} isLoading={isLoading} compact formatPrice={formatPrice} />
        </div>
        <QuantityCalculator compact customQuantity={customQuantity} onQuantityChange={setCustomQuantity} minQuantity={minQuantity} unitPrice={customPriceInfo.unitPrice} total={customTotal} discount={customPriceInfo.discount} formatPrice={formatPrice} />
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-primary/5 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center"><Calculator className="h-5 w-5 text-primary" /></div>
                <div><CardTitle className="text-base">Tabela de Preços</CardTitle><p className="text-sm text-muted-foreground">Veja os descontos por quantidade</p></div>
              </div>
              {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            <div className="overflow-hidden rounded-lg border border-border">
              <PriceTiersTable tiers={priceTiers} isLoading={isLoading} formatPrice={formatPrice} />
            </div>
            <Separator />
            <QuantityCalculator customQuantity={customQuantity} onQuantityChange={setCustomQuantity} minQuantity={minQuantity} unitPrice={customPriceInfo.unitPrice} total={customTotal} discount={customPriceInfo.discount} formatPrice={formatPrice} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
