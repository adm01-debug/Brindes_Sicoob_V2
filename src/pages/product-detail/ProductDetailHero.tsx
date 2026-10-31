/**
 * ProductDetailHero — Seção hero com galeria + info do produto
 * Extraído de ProductDetail para reduzir complexidade
 */

import { useState } from "react";
import { KitComposition } from "@/components/products/KitComposition";
import { useProductFreshnessOverride } from "@/hooks/useProductFreshnessOverride";
import { DEFAULT_PRICE_FRESHNESS_THRESHOLD_DAYS } from "@/utils/price-freshness";
import type { Product, ProductVariation } from "@/types/product-catalog";
import {
  ProductGalleryPanel,
  ProductHeroHeader,
  ProductPriceCard,
  ProductQuickActionsPanel,
  ProductSpecsCard,
} from "./ProductDetailHeroSections";

interface ProductDetailHeroProps {
  product: Product;
  id: string;
  selectedVariation: ProductVariation | null;
  setSelectedVariation: (variation: ProductVariation | null) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  viewCount: number;
  onOpenPackagingModal: () => void;
  onOpenFutureStock: () => void;
  onOpenSupplierComparison: () => void;
}

const getStockStatusInfo = (status: string) => {
  switch (status) {
    case "in-stock": return { label: "Em estoque", class: "bg-success/10 text-success border-success/20" };
    case "low-stock": return { label: "Estoque baixo", class: "bg-warning/10 text-warning border-warning/20" };
    case "out-of-stock": return { label: "Sem estoque", class: "bg-destructive/10 text-destructive border-destructive/20" };
    default: return { label: "Consultar", class: "bg-muted text-muted-foreground" };
  }
};

export function ProductDetailHero({
  product, id, selectedVariation, setSelectedVariation,
  isFavorite, onToggleFavorite, viewCount,
  onOpenPackagingModal, onOpenFutureStock, onOpenSupplierComparison,
}: ProductDetailHeroProps) {
  const [quoteVariantWizardOpen, setQuoteVariantWizardOpen] = useState(false);
  const minQuantity = product.minQuantity || 1;
  const stockInfo = getStockStatusInfo(product.stockStatus);

  // Override local (admin-only) tem precedência sobre o valor exposto pelo BD
  // externo. Quando ambos são nulos, o util cai no default de 60 dias.
  const { data: freshnessOverride } = useProductFreshnessOverride(id);
  const effectiveThresholdDays =
    freshnessOverride?.threshold_days ??
    product.priceFreshnessThresholdDays ??
    DEFAULT_PRICE_FRESHNESS_THRESHOLD_DAYS;

  return (
    <div className="grid min-w-0 overflow-x-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 lg:gap-6 xl:gap-8">
      <ProductGalleryPanel product={product} selectedVariation={selectedVariation} onSelectVariation={setSelectedVariation} />

      <div className="flex flex-col gap-3 md:gap-4 xl:gap-5 min-w-0">
        <ProductHeroHeader product={product} selectedVariation={selectedVariation} minQuantity={minQuantity}
          onOpenPackagingModal={onOpenPackagingModal} onOpenFutureStock={onOpenFutureStock}
          onOpenSupplierComparison={onOpenSupplierComparison} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xl:gap-4 items-stretch flex-1">
          <ProductPriceCard product={product} id={id} selectedVariation={selectedVariation}
            onSelectVariation={setSelectedVariation} minQuantity={minQuantity} thresholdDays={effectiveThresholdDays}
            stockLabelClass={stockInfo.class} wizardOpen={quoteVariantWizardOpen} setWizardOpen={setQuoteVariantWizardOpen}
            favorite={isFavorite} onToggleFavorite={onToggleFavorite} viewCount={viewCount} />
          <ProductSpecsCard product={product} />
        </div>

        {/* Kit Composition */}
        {product.isKit && product.kitItems && <KitComposition items={product.kitItems} />}

        <ProductQuickActionsPanel product={product} selectedVariation={selectedVariation} />
      </div>
    </div>
  );
}
