import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, generatePriceBreakdown, calculateTotalKitPrice, type KitState } from "@/lib/kit-builder";

interface KitPricingCardProps {
  kitState: KitState;
  kitQuantity: number;
  onKitQuantityChange: (quantity: number) => void;
}

function QuantityPricing({ kitState, kitQuantity, onChange }: {
  kitState: KitState;
  kitQuantity: number;
  onChange: (quantity: number) => void;
}) {
  const { box, items, personalization } = kitState;
  return <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">
    <TrendingUp className="h-4 w-4 text-primary" />Preço por Quantidade
  </CardTitle></CardHeader><CardContent><div className="grid grid-cols-5 gap-2 text-center">
    {[50, 100, 200, 500, 1000].map((quantity) => {
      const price = calculateTotalKitPrice(box, items, personalization, quantity);
      const current = quantity === kitQuantity;
      return <button key={quantity} onClick={() => onChange(quantity)}
        className={cn("rounded-lg p-2.5 border transition-all cursor-pointer", current
          ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border/50 bg-secondary/30 hover:border-primary/30")}>
        <p className="text-[11px] text-muted-foreground">{quantity} kits</p>
        <p className={cn("text-sm font-bold", current && "text-primary")}>{formatCurrency(price.unitPrice)}</p>
        <p className="text-[10px] text-muted-foreground">/kit</p>
      </button>;
    })}
  </div></CardContent></Card>;
}

export function KitPricingCard({ kitState, kitQuantity, onKitQuantityChange }: KitPricingCardProps) {
  const { box, items, personalization } = kitState;
  const pricing = calculateTotalKitPrice(box, items, personalization, kitQuantity);
  const breakdown = generatePriceBreakdown(box, items, personalization, kitQuantity);

  return (
    <>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Detalhamento de Preços</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {breakdown.map((item, index) => (
              <div key={index} className={cn("flex items-center justify-between py-2", item.isPersonalization && "text-primary pl-4")}>
                <div className="flex items-center gap-2">
                  <span className={cn(item.isPersonalization && "text-sm")}>{item.label}</span>
                  {item.quantity && item.quantity > 1 && <span className="text-xs text-muted-foreground">({item.quantity}x {formatCurrency(item.unitPrice)})</span>}
                </div>
                <span className={cn("font-medium", item.isPersonalization && "text-sm")}>{formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Produtos ({kitQuantity} {kitQuantity === 1 ? 'kit' : 'kits'})</span><span>{formatCurrency(pricing.subtotal)}</span></div>
            {pricing.personalizationPrice > 0 && <div className="flex justify-between text-sm text-primary"><span>Personalização</span><span>{formatCurrency(pricing.personalizationPrice)}</span></div>}
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between items-center">
            <div><p className="text-lg font-bold">Total</p><p className="text-sm text-muted-foreground">{formatCurrency(pricing.unitPrice)}/kit</p></div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(pricing.total)}</p>
          </div>
        </CardContent>
      </Card>

      <QuantityPricing kitState={kitState} kitQuantity={kitQuantity} onChange={onKitQuantityChange} />
    </>
  );
}
