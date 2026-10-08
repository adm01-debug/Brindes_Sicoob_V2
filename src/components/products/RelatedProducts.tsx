import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";

interface RelatedProductsProps {
  currentProduct: Product;
  allProducts: Product[];
  maxItems?: number;
}

function ProductMiniCard({ product, onClick }: { product: Product; onClick: () => void }) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl bg-card border border-border/50 overflow-hidden",
        "transition-all duration-300 cursor-pointer",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
      )}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
        {product.newArrival && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
            Novo
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-xs text-muted-foreground truncate">{product.category.name}</p>
        <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {product.name}
        </h4>
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-foreground">
            R$ {product.price.toFixed(2).replace('.', ',')}
          </span>
          <div className="flex gap-0.5">
            {product.colors.slice(0, 3).map((color, idx) => (
              <div
                key={idx}
                className="w-3 h-3 rounded-full border border-background"
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function relatedTo(current: Product, products: Product[], maxItems: number) {
  const sameCategory = products.filter((product) => product.id !== current.id && product.category.id === current.category.id);
  let related = [...sameCategory];
  if (related.length < maxItems) {
    const materials = Array.isArray(current.materials) ? current.materials : [];
    related = related.concat(products.filter((product) => product.id !== current.id && !sameCategory.includes(product) && (Array.isArray(product.materials) ? product.materials : []).some((material) => materials.includes(material))));
  }
  if (related.length < maxItems) {
    const colorGroups = current.colors.map((color) => color.group);
    related = related.concat(products.filter((product) => product.id !== current.id && !related.includes(product) && product.colors.some((color) => colorGroups.includes(color.group))));
  }
  return related.slice(0, maxItems);
}

function recommendationScore(product: Product, current: Product, currentTags: string[]) {
  const tags = [...product.tags.publicoAlvo, ...product.tags.datasComemorativas, ...product.tags.nicho];
  let score = tags.filter((tag) => currentTags.includes(tag)).length * 2;
  if (product.supplier.id === current.supplier.id) score += 1;
  if (product.featured) score += 1;
  if (Math.abs(product.price - current.price) < current.price * 0.3) score += 1;
  return score;
}

function recommendedFor(current: Product, products: Product[], maxItems: number) {
  const tags = [...current.tags.publicoAlvo, ...current.tags.datasComemorativas, ...current.tags.nicho];
  return products.filter((product) => product.id !== current.id).map((product) => ({ product, score: recommendationScore(product, current, tags) })).filter((item) => item.score > 0).sort((left, right) => right.score - left.score).slice(0, maxItems).map((item) => item.product);
}

function ProductCards({ products, onOpen }: { products: Product[]; onOpen: (product: Product) => void }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{products.map((product, index) => <div key={product.id} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}><ProductMiniCard product={product} onClick={() => onOpen(product)} /></div>)}</div>;
}

export function RelatedProducts({ currentProduct, allProducts, maxItems = 4 }: RelatedProductsProps) {
  const navigate = useNavigate();

  const relatedProducts = useMemo(() => relatedTo(currentProduct, allProducts, maxItems), [currentProduct, allProducts, maxItems]);

  if (relatedProducts.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">
          Produtos Relacionados
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-primary"
          onClick={() => navigate(`/?category=${currentProduct.category.id}`)}
        >
          Ver mais
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <ProductCards products={relatedProducts} onOpen={(product) => navigate(`/produto/${product.id}`)} />
    </section>
  );
}

interface RecommendedProductsProps {
  currentProduct: Product;
  allProducts: Product[];
  maxItems?: number;
}

export function RecommendedProducts({ currentProduct, allProducts, maxItems = 4 }: RecommendedProductsProps) {
  const navigate = useNavigate();

  const recommendedProducts = useMemo(() => recommendedFor(currentProduct, allProducts, maxItems), [currentProduct, allProducts, maxItems]);

  if (recommendedProducts.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg shadow-primary/25">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Recomendados para Você
          </h2>
          <p className="text-sm text-muted-foreground">
            Baseado no produto que você está vendo
          </p>
        </div>
      </div>

      <ProductCards products={recommendedProducts} onOpen={(product) => navigate(`/produto/${product.id}`)} />
    </section>
  );
}
