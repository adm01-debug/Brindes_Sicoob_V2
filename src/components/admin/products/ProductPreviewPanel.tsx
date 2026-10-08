/**
 * ProductPreviewPanel — Preview em tempo real de como o produto aparece no catálogo
 * Espelha o layout do ProductCard do catálogo, usando dados do formulário via watch()
 */

import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getCdnUrl } from '@/utils/image-utils';
import {
  Eye,
  Package,
  Sparkles,
  Layers,
  Building2,
  ImageIcon,
} from 'lucide-react';

interface ProductPreviewPanelProps {
  name: string;
  sku: string;
  salePrice: number;
  stockQuantity: number;
  images: string[];
  brand: string;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
  isKit: boolean;
  isActive: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

const getStockStatus = (qty: number) => {
  if (qty <= 0) return { label: 'Sem estoque', color: 'text-destructive' };
  if (qty <= 10) return { label: 'Estoque baixo', color: 'text-warning' };
  return { label: 'Em estoque', color: 'text-success' };
};

function PreviewImage({ imageUrl, name, isFeatured, isNew, isOnSale, isKit, isActive }: Pick<ProductPreviewPanelProps, 'name' | 'isFeatured' | 'isNew' | 'isOnSale' | 'isKit' | 'isActive'> & { imageUrl: string | null }) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-muted/30">
      {imageUrl ? <img src={imageUrl} alt={name || 'Produto'} className="w-full h-full object-contain" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/40"><ImageIcon className="h-10 w-10" /><span className="text-[10px] font-medium">Sem imagem</span></div>}
      {isFeatured && <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />}
      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
        {isFeatured && <Badge className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground text-[10px] px-1.5 py-0.5 shadow-lg"><Sparkles className="h-2.5 w-2.5 mr-0.5" />Destaque</Badge>}
        {isNew && <Badge className="bg-gradient-to-r from-info to-info/80 text-info-foreground text-[10px] px-1.5 py-0.5 shadow-md">Novidade</Badge>}
        {isOnSale && <Badge className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground text-[10px] px-1.5 py-0.5 shadow-md">Promoção</Badge>}
        {isKit && <Badge className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground text-[10px] px-1.5 py-0.5 shadow-md"><Layers className="h-2.5 w-2.5 mr-0.5" />KIT</Badge>}
      </div>
      {!isActive && <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm"><Badge variant="destructive" className="text-xs px-3 py-1">Inativo</Badge></div>}
    </div>
  );
}

function PreviewInfo({ name, sku, salePrice, stockQuantity, brand }: Pick<ProductPreviewPanelProps, 'name' | 'sku' | 'salePrice' | 'stockQuantity' | 'brand'>) {
  const stock = getStockStatus(stockQuantity);
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground font-mono truncate">{sku || 'SEM-SKU'}</span>
        {brand && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium shrink-0 truncate max-w-[100px] flex items-center gap-1"><Building2 className="h-2.5 w-2.5 shrink-0" />{brand}</span>}
      </div>
      <h3 className="font-display font-semibold text-foreground line-clamp-2 min-h-[2.25rem] text-sm leading-snug">{name || <span className="text-muted-foreground/40 italic">Nome do produto</span>}</h3>
      <div className="flex items-end justify-between pt-1">
        <div><p className="text-[10px] text-muted-foreground mb-0.5">A partir de</p><span className="text-base font-display font-bold text-foreground">{salePrice > 0 ? formatPrice(salePrice) : <span className="text-muted-foreground/40">R$ 0,00</span>}</span></div>
        <div className="flex flex-col items-end gap-0.5"><span className={cn('flex items-center gap-1 text-[10px] font-medium', stock.color)}><Package className="h-2.5 w-2.5" />{stock.label}</span><span className="text-[10px] text-muted-foreground">{stockQuantity.toLocaleString('pt-BR')} un.</span></div>
      </div>
    </div>
  );
}

function PreviewThumbnails({ images }: { images: string[] }) {
  if (images.length <= 1) return null;
  return (
    <div className="flex gap-1.5 px-1">
      {images.slice(0, 4).map((image, index) => <div key={image} className="w-10 h-10 rounded-md overflow-hidden border border-border/50 bg-muted/30"><img src={getCdnUrl(image, 'card')} alt={`Imagem ${index + 1}`} className="w-full h-full object-contain" loading="lazy" /></div>)}
      {images.length > 4 && <div className="w-10 h-10 rounded-md border border-border/50 bg-muted/30 flex items-center justify-center"><span className="text-[10px] font-medium text-muted-foreground">+{images.length - 4}</span></div>}
    </div>
  );
}

export const ProductPreviewPanel = memo(function ProductPreviewPanel({ name, sku, salePrice, stockQuantity, images, brand, isFeatured, isNew, isOnSale, isKit, isActive }: ProductPreviewPanelProps) {
  const imageUrl = (images[0] ? getCdnUrl(images[0], 'card') : null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Preview do Catálogo
        </span>
      </div>

      {/* Card preview */}
      <Card
        className={cn(
          'overflow-hidden border-border/50 bg-card transition-all duration-300',
          (!isActive && 'opacity-50 grayscale'),
          (isFeatured && 'ring-2 ring-primary/20 shadow-lg'),
        )}
      >
        <PreviewImage
          imageUrl={imageUrl}
          name={name}
          isFeatured={isFeatured}
          isNew={isNew}
          isOnSale={isOnSale}
          isKit={isKit}
          isActive={isActive}
        />
        <PreviewInfo name={name} sku={sku} salePrice={salePrice} stockQuantity={stockQuantity} brand={brand} />
      </Card>

      <PreviewThumbnails images={images} />
      {/* Status summary */}
      <div className="px-1 pt-1 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground/60 italic">
          Preview atualizado em tempo real conforme você edita os campos do formulário.
        </p>
      </div>
    </div>
  );
});
