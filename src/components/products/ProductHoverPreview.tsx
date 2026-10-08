import { type ReactNode, useState } from "react";
import { Package, Tag, Palette, Truck } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";

interface ProductHoverPreviewProps {
  product: Product;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
}

function PreviewBadges({ product }: { product: Product }) {
  return (
    <div className="absolute top-2 left-2 flex flex-col gap-1">
      {product.featured && <Badge className="bg-primary text-primary-foreground text-xs">Destaque</Badge>}
      {product.newArrival && <Badge className="bg-info text-info-foreground text-xs">Novidade</Badge>}
    </div>
  );
}

function ProductPreviewImage({ product, loaded, onLoad }: { product: Product; loaded: boolean; onLoad: () => void }) {
  return (
    <div className="relative aspect-[16/10] bg-muted overflow-hidden">
      {!loaded && <div className="absolute inset-0 bg-muted/30" />}
      <img src={product.images[0]} alt={product.name} className={cn("w-full h-full object-cover transition-all duration-700 ease-out", loaded ? "opacity-100 blur-0 scale-100" : "opacity-40 blur-md scale-105")} onLoad={onLoad} />
      <PreviewBadges product={product} />
      <div className="absolute bottom-2 right-2"><span className="bg-card/95 backdrop-blur-sm text-foreground font-bold px-3 py-1.5 rounded-full text-sm shadow-lg">{formatPrice(product.price)}</span></div>
    </div>
  );
}

function ColorPreview({ product }: { product: Product }) {
  if (product.colors.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 pt-1">
      {product.colors.slice(0, 8).map((color) => <div key={`${color.name}-${color.hex}`} className="w-4 h-4 rounded-full border border-border/50 shadow-sm" style={{ backgroundColor: color.hex }} title={color.name} />)}
      {product.colors.length > 8 && <span className="text-xs text-muted-foreground ml-1">+{product.colors.length - 8}</span>}
    </div>
  );
}

function MaterialPreview({ product }: { product: Product }) {
  if (!Array.isArray(product.materials) || product.materials.length === 0) return null;
  return <div className="flex flex-wrap gap-1">{product.materials.slice(0, 3).map((material) => <Badge key={material} variant="secondary" className="text-xs py-0 h-5">{material}</Badge>)}</div>;
}

function PreviewContent({ product }: { product: Product }) {
  return (
    <div className="p-4 space-y-3">
      <div>
        <p className="text-xs text-muted-foreground font-medium">{product.supplier.name}</p>
        <h4 className="font-semibold text-foreground line-clamp-2 mt-0.5">{product.name}</h4>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground"><Package className="h-3.5 w-3.5 text-primary" /><span>{product.stock.toLocaleString('pt-BR')} un.</span></div>
        <div className="flex items-center gap-2 text-muted-foreground"><Tag className="h-3.5 w-3.5 text-primary" /><span>Mín. {product.minQuantity || 1} un.</span></div>
        <div className="flex items-center gap-2 text-muted-foreground"><Palette className="h-3.5 w-3.5 text-primary" /><span>{product.colors.length} cores</span></div>
        <div className="flex items-center gap-2 text-muted-foreground"><Truck className="h-3.5 w-3.5 text-primary" /><span>Consultar prazo</span></div>
      </div>
      <ColorPreview product={product} />
      <MaterialPreview product={product} />
    </div>
  );
}

export function ProductHoverPreview({ 
  product, 
  children, 
  side = "right",
  align = "center"
}: ProductHoverPreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        side={side} 
        align={align}
        className="w-80 p-0 overflow-hidden"
        sideOffset={8}
      >
        {/* Image */}
        <ProductPreviewImage product={product} loaded={imageLoaded} onLoad={() => setImageLoaded(true)} />
        
        {/* Content */}
        <PreviewContent product={product} />
      </HoverCardContent>
    </HoverCard>
  );
}
