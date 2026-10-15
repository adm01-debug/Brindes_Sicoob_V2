import { useState, useMemo } from 'react';
import { useExternalProductSearch } from '@/hooks/useExternalSimulator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Package, X } from 'lucide-react';
import { formatCurrency } from './utils';
import type { Product } from './types';

interface ProductSearchProps {
  onSelect: (product: Product | null) => void;
  selectedProduct: Product | null;
}

function ProductThumbnail({ product, size = "md" }: { product: Product; size?: "sm" | "md" }) {
  const image = product.images?.[0];
  const containerClass = size === "md" ? "w-12 h-12" : "w-10 h-10";
  const iconClass = size === "md" ? "w-6 h-6" : "w-5 h-5";
  return (
    <div className={`${containerClass} rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0`}>
      {image ? <img src={image} alt={product.name} className="w-full h-full object-cover" loading="lazy" /> : <Package className={`${iconClass} text-muted-foreground`} />}
    </div>
  );
}

function SelectedProduct({ product, onClear }: { product: Product; onClear: () => void }) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ProductThumbnail product={product} />
          <div>
            <p className="font-medium">{product.name}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>SKU: {product.sku}</span><span>•</span>
              <span className="text-primary font-medium">{product.priceAvailable === false ? 'Preço indisponível' : formatCurrency(product.price)}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClear}><X className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

function ProductResults({ products, onSelect }: { products: Product[]; onSelect: (product: Product) => void }) {
  if (products.length === 0) return null;
  return (
    <ScrollArea className="h-64">
      <div className="space-y-1">
        {products.map((product) => (
          <button key={product.id} onClick={() => onSelect(product)} className="w-full p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left flex items-center gap-3">
            <ProductThumbnail product={product} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.sku} • {product.priceAvailable === false ? 'Preço indisponível' : formatCurrency(product.price)}</p>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input aria-label="Buscar produto por nome ou SKU" placeholder="Buscar produto por nome ou SKU..." value={value} onChange={(event) => onChange(event.target.value)} className="pl-9" autoFocus />
    </div>
  );
}

function SearchLoading({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <div className="space-y-2">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16" />)}</div>;
}

function NoSearchResults({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p>Nenhum produto encontrado</p>
    </div>
  );
}

export function ProductSearch({ onSelect, selectedProduct }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { data: externalProducts, isLoading } = useExternalProductSearch(searchQuery);

  // Mapear produtos externos para o formato interno
  const mappedProducts = useMemo(() => {
    if (!externalProducts) return [];
    return externalProducts.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: typeof p.sale_price === 'number' && Number.isFinite(p.sale_price) ? p.sale_price : 0,
      priceAvailable: typeof p.sale_price === 'number' && Number.isFinite(p.sale_price),
      images: p.images || (p.primary_image_url ? [p.primary_image_url] : []),
      category_name: null,
      supplier_reference: p.supplier_reference,
      brand: p.brand,
    }));
  }, [externalProducts]);

  const products = useMemo(() => {
    if (!mappedProducts.length) return [];
    return mappedProducts;
  }, [mappedProducts]);

  if (selectedProduct && !isSearching) {
    return <SelectedProduct product={selectedProduct} onClear={() => { onSelect(null); setIsSearching(true); }} />;
  }

  return (
    <div className="space-y-3">
      <SearchField value={searchQuery} onChange={setSearchQuery} />
      <SearchLoading visible={isLoading} />

      <ProductResults products={products} onSelect={(product) => { onSelect(product); setIsSearching(false); setSearchQuery(''); }} />

      <NoSearchResults visible={searchQuery.length >= 2 && products.length === 0 && !isLoading} />
    </div>
  );
}
