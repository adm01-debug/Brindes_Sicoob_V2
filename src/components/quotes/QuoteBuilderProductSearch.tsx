/**
 * QuoteBuilderProductSearch — Dialog de busca e seleção de produtos
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Package, PackageCheck, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuoteProductColorSelector } from "@/components/quotes/QuoteProductColorSelector";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  costPrice?: number;
  images: string[] | null;
  colors?: { name: string; hex?: string; stock?: number }[];
  totalStock?: number;
}

interface Props {
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productSearch: string;
  setProductSearch: (v: string) => void;
  filteredProducts: Product[];
  selectedProductForColor: Product | null;
  setSelectedProductForColor: (p: Product | null) => void;
  onProductClick: (p: Product) => void;
  onAddWithColor: (p: Product, v: ExternalVariantStock | null) => void;
  formatCurrency: (v: number) => string;
}

function formatStock(quantity: number): string {
  return quantity >= 1000 ? `${(quantity / 1000).toFixed(1)}k` : quantity.toString();
}

function ProductThumbnail({ product, image, outOfStock, lowStock }: {
  product: Product; image: string | undefined; outOfStock: boolean; lowStock: boolean;
}) {
  return <div className="relative shrink-0">{image
    ? <img loading="lazy" src={`${image}/thumbnail`} alt={product.name} className="h-11 w-11 object-cover rounded-lg bg-muted"
      onError={(event) => { const target = event.currentTarget; if (target.src.includes('/thumbnail')) target.src = image; else target.style.display = 'none'; }} />
    : <div className="h-11 w-11 bg-muted rounded-lg flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>}
    {outOfStock && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center"><X className="h-2.5 w-2.5 text-destructive-foreground" /></div>}
    {lowStock && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-warning flex items-center justify-center"><AlertTriangle className="h-2.5 w-2.5 text-primary-foreground" /></div>}
  </div>;
}

function ProductColors({ colors }: { colors: Product['colors'] }) {
  if (!colors || colors.length === 0) return null;
  return <div className="flex items-center gap-0.5">{colors.slice(0, 5).map((color, index) =>
    <div key={`${color.name}-${index}`} className="w-2.5 h-2.5 rounded-full border border-border/50"
      style={{ backgroundColor: color.hex || '#CCC' }} title={color.name} />)}
    {colors.length > 5 && <span className="text-[9px] text-muted-foreground ml-0.5">+{colors.length - 5}</span>}
  </div>;
}

function ProductStock({ stock }: { stock: number }) {
  if (stock === 0) return <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-destructive">
    <AlertTriangle className="h-2.5 w-2.5" />Sem estoque</span>;
  const low = stock < 100;
  return <span className={cn('inline-flex items-center gap-0.5 text-[10px]', low ? 'font-medium text-warning' : 'text-muted-foreground')}>
    {low ? <AlertTriangle className="h-2.5 w-2.5" /> : <PackageCheck className="h-2.5 w-2.5 text-success" />}{formatStock(stock)} un</span>;
}

function productResultClass(outOfStock: boolean, lowStock: boolean): string {
  if (outOfStock) return 'border-destructive/20 bg-destructive/5 opacity-75';
  if (lowStock) return 'border-warning/20 hover:bg-accent/60';
  return 'border-transparent hover:bg-accent/60';
}

function ProductResult({ product, onClick, formatCurrency }: {
  product: Product; onClick: (product: Product) => void; formatCurrency: (value: number) => string;
}) {
  const stock = product.totalStock ?? 0;
  const primaryImage = product.images?.[0];
  const isOutOfStock = stock === 0;
  const isLowStock = stock > 0 && stock < 100;
  return <button onClick={() => onClick(product)} className={cn(
    'group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left',
    productResultClass(isOutOfStock, isLowStock))}>
    <ProductThumbnail product={product} image={primaryImage} outOfStock={isOutOfStock} lowStock={isLowStock} />
    <div className="flex-1 min-w-0 space-y-0.5"><p className="font-medium truncate text-sm">{product.name}</p>
      <div className="flex items-center gap-2"><span className="text-[11px] text-muted-foreground font-mono">{product.sku}</span>
        <ProductColors colors={product.colors} />
      </div>
    </div>
    <div className="text-right shrink-0 pl-2 space-y-0.5"><p className="text-sm font-semibold text-primary tabular-nums">{formatCurrency(product.price)}</p>
      <ProductStock stock={stock} />
    </div>
  </button>;
}

function ProductSearchHeader({ selectingColor }: { selectingColor: boolean }) {
  return <DialogHeader><DialogTitle className="flex items-center gap-2.5">
    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="h-4 w-4 text-primary" /></div>
    <div><span className="font-semibold text-base">{selectingColor ? "Selecionar Cor" : "Adicionar Produto"}</span>
      <p className="text-xs text-muted-foreground font-normal">{selectingColor
        ? "Escolha a cor desejada para adicionar ao orçamento" : "Busque e selecione um produto para o orçamento"}</p>
    </div>
  </DialogTitle></DialogHeader>;
}

export function QuoteBuilderProductSearch(props: Props) {
  const { canEdit, open, onOpenChange, productSearch, setProductSearch, filteredProducts, selectedProductForColor,
    setSelectedProductForColor, onProductClick, onAddWithColor, formatCurrency } = props;
  return (
    <Dialog open={open && canEdit} onOpenChange={(o) => { if (o && !canEdit) return; onOpenChange(o); if (!o) { setSelectedProductForColor(null); setProductSearch(""); } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-4">
        <ProductSearchHeader selectingColor={Boolean(selectedProductForColor)} />
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          {selectedProductForColor ? (
            <QuoteProductColorSelector
              product={selectedProductForColor}
              onSelect={(variant) => onAddWithColor(selectedProductForColor, variant)}
              onBack={() => setSelectedProductForColor(null)}
            />
          ) : (
            <>
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou SKU..." value={productSearch} disabled={!canEdit} onChange={(e) => setProductSearch(e.target.value)} className="pl-10 h-11 text-sm border-primary/30 focus-visible:ring-primary/20" autoFocus />
                {productSearch && (
                  <button onClick={() => setProductSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} disponíve{filteredProducts.length !== 1 ? 'is' : 'l'}
              </p>
              <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhum produto encontrado</p>
                    {productSearch && <Button variant="outline" size="sm" className="mt-3" onClick={() => setProductSearch("")}>Limpar busca</Button>}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredProducts.map((product) => <ProductResult key={product.id} product={product}
                      onClick={onProductClick} formatCurrency={formatCurrency} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
