import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Package, Gift, Palette, Image } from "lucide-react";
import { formatCurrency, formatDimensions, formatVolume, type KitState } from "@/lib/kit-builder";

interface KitCompositionCardProps {
  kitState: KitState;
  kitQuantity: number;
  stockByProduct: Map<string, number>;
}

type KitBox = NonNullable<KitState["box"]>;
type KitItem = KitState["items"][number];
type ItemPersonalization = KitState["personalization"]["items"][string];

function ProductImage({ imageUrl, name, compact = false }: { imageUrl?: string | null; name: string; compact?: boolean }) {
  const Icon = compact ? Gift : Package;
  if (imageUrl) return <img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />;
  return <div className="w-full h-full flex items-center justify-center"><Icon className={compact ? "h-5 w-5 text-muted-foreground" : "h-6 w-6 text-muted-foreground"} /></div>;
}

function BoxSummary({ box }: { box: KitBox }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 mb-3">
      <div className="w-12 h-12 rounded-md bg-background overflow-hidden"><ProductImage imageUrl={box.imageUrl} name={box.name} /></div>
      <div className="flex-1">
        <p className="font-medium">{box.name}</p>
        <p className="text-xs text-muted-foreground">{formatDimensions(box.internalWidth, box.internalHeight, box.internalDepth)} • {formatVolume(box.internalVolume)}</p>
      </div>
      <div className="text-right"><p className="font-semibold">{formatCurrency(box.price)}</p><p className="text-xs text-muted-foreground">por kit</p></div>
    </div>
  );
}

function ItemStockBadge({ available, required }: { available?: number; required: number }) {
  if (available === undefined) return null;
  const enoughStock = available >= required;
  return (
    <Badge variant={enoughStock ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0">
      {enoughStock ? `${available} em estoque` : `⚠ ${available} disponível`}
    </Badge>
  );
}

interface KitItemRowProps {
  item: KitItem;
  personalization?: ItemPersonalization;
  kitQuantity: number;
  availableStock?: number;
  onOpenMockup: (productId: string, techniqueName?: string) => void;
}

function KitItemRow({ item, personalization, kitQuantity, availableStock, onOpenMockup }: KitItemRowProps) {
  const weight = item.weight ? ` • ${item.weight >= 1000 ? `${(item.weight / 1000).toFixed(1)}kg` : `${item.weight}g`}` : "";
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30">
      <div className="w-10 h-10 rounded-md bg-secondary overflow-hidden"><ProductImage imageUrl={item.imageUrl} name={item.name} compact /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.quantity}x</span><span className="truncate">{item.name}</span>
          {personalization?.enabled && <Badge variant="outline" className="text-xs flex-shrink-0"><Palette className="h-3 w-3 mr-1" />{personalization.techniqueName}</Badge>}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <p className="text-xs text-muted-foreground"><span className="font-mono">{item.sku}</span>{weight}{item.material ? ` • ${item.material}` : ""}{item.isOptional && <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">Opcional</Badge>}</p>
          <ItemStockBadge available={availableStock} required={item.quantity * kitQuantity} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Imagem" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onOpenMockup(item.id, personalization?.enabled ? personalization.techniqueName : undefined)}><Image className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Gerar Mockup</p></TooltipContent></Tooltip></TooltipProvider>
        <div className="text-right flex-shrink-0"><p className="font-medium">{formatCurrency(item.price * item.quantity)}</p></div>
      </div>
    </div>
  );
}

export function KitCompositionCard({ kitState, kitQuantity, stockByProduct }: KitCompositionCardProps) {
  const navigate = useNavigate();
  const { box, items, personalization } = kitState;

  const handleOpenMockup = (productId: string, techniqueName?: string) => {
    const params = new URLSearchParams();
    params.set('product_id', productId);
    if (techniqueName) params.set('technique', techniqueName);
    navigate(`/mockup-generator?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg">Composição do Kit</CardTitle></CardHeader>
      <CardContent>
        {box && <BoxSummary box={box} />}
        <div className="space-y-2">
          {items.map(item => <KitItemRow key={item.id} item={item} personalization={personalization.items[item.id]} kitQuantity={kitQuantity} availableStock={stockByProduct.get(item.id)} onOpenMockup={handleOpenMockup} />)}
        </div>
      </CardContent>
    </Card>
  );
}
