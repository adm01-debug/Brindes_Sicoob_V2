import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getCdnUrl } from "@/utils/image-utils";
// import { MainLayout } from "@/components/layout/MainLayout";
import { ProductStickyHeader } from "@/components/products/ProductStickyHeader";
import { SimilarProducts } from "@/components/products/SimilarProducts";
import { SmartRecommendations } from "@/components/products/SmartRecommendations";
import { useSimilarProducts } from "@/hooks/useSimilarProducts";
import type { ProductForRecommendation } from "@/hooks/useAIRecommendations";
import { ProductIntelligence } from "@/components/products/ProductIntelligence";
import { StockHistoryChart } from "@/components/products/StockHistoryChart";
import { SalesHistoryChart } from "@/components/products/SalesHistoryChart";
import { SupplierComparisonModal } from "@/components/compare/SupplierComparisonModal";
import { VariantPickerDialog } from "@/components/products/VariantPickerDialog";
import { FutureStockModal } from "@/components/products/FutureStockModal";
import { PackagingModal } from "@/components/products/PackagingModal";
import { useToast } from "@/hooks/use-toast";
import { showUndoToast } from "@/utils/undoToast";

import { useProductAnalytics } from "@/hooks/useProductAnalytics";
import { useProduct } from "@/hooks/useProducts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductDetailSkeleton } from "@/components/products/ProductDetailSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { IntelligenceBadges } from "@/components/common/IntelligenceBadges";
import { useProductIntelligenceBadges } from "@/hooks/useProductIntelligenceBadges";
import { useSupplierTrust } from "@/hooks/useSupplierTrust";
import { FloatingCompareBar } from "@/components/compare/FloatingCompareBar";
import { MobileProductActions } from "@/components/mobile/MobileProductActions";
import { useRecentlyViewedStore } from "@/stores/useRecentlyViewedStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { ProductDetailHero } from "./product-detail/ProductDetailHero";

type ProductVariation = any;

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { trackProductView } = useProductAnalytics();

  const { isFavorite: isFavoriteCheck, toggleFavorite, removeFavorite } = useFavoritesStore();
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [favPickerOpen, setFavPickerOpen] = useState(false);
  const [colorAutoSelected, setColorAutoSelected] = useState(false);
  const [supplierCompareOpen, setSupplierCompareOpen] = useState(false);
  const [futureStockOpen, setFutureStockOpen] = useState(false);
  const [packagingModalOpen, setPackagingModalOpen] = useState(false);
  const { addToRecentlyViewed } = useRecentlyViewedStore();

  const { data: product, isLoading, isError } = useProduct(id || "");
  const { data: supplierTrust } = useSupplierTrust(id);
  const { data: similarItems = [] } = useSimilarProducts(product);
  const aiCandidates = useMemo<ProductForRecommendation[]>(
    () => similarItems.slice(0, 12).map((it) => ({
      id: it.id,
      name: it.name,
      category: it.category_name || product?.category?.name || "Brindes",
      priceRange: `R$ ${it.price.toFixed(2)}`,
      tags: [it.supplier_name].filter(Boolean) as string[],
    })),
    [similarItems, product?.category?.name]
  );
  const catalogFlags = useMemo(() => product ? {
    featured: product.featured, newArrival: product.newArrival, onSale: product.onSale,
    lowStock: product.stockStatus === 'low-stock', stock: product.stock,
  } : undefined, [product?.featured, product?.newArrival, product?.onSale, product?.stockStatus, product?.stock]);
  const { badges: intellBadges, turnoverScore: intellTurnover, isDemo: intellIsDemo } = useProductIntelligenceBadges(id, catalogFlags);

  const { data: viewCount = 0 } = useQuery({
    queryKey: ["product-views-count", id],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count } = await supabase.from("product_views").select("*", { count: "exact", head: true }).eq("product_id", id!).gte("created_at", thirtyDaysAgo.toISOString());
      return count || 0;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (product) { trackProductView({ productId: product.id, productSku: product.sku, productName: product.name, viewType: "detail" }); addToRecentlyViewed(product.id); }
  }, [product, trackProductView, addToRecentlyViewed]);

  // Auto-select color from URL
  useEffect(() => {
    if (!product || colorAutoSelected) return;
    const corParam = searchParams.get('cor');
    const grupoParam = searchParams.get('grupo');
    const hexParam = searchParams.get('hex');
    if ((!corParam && !grupoParam && !hexParam) || !product.variations?.length) return;
    const normalizedParam = corParam?.toLowerCase().trim() || '';
    let match = product.variations.find((v: any) => v.color?.name?.toLowerCase().trim() === normalizedParam);
    if (!match && normalizedParam) match = product.variations.find((v: any) => { const name = v.color?.name?.toLowerCase().trim() || ''; return name.includes(normalizedParam) || normalizedParam.includes(name); });
    if (!match && hexParam) match = product.variations.find((v: any) => v.color?.hex?.toLowerCase() === hexParam.toLowerCase());
    if (!match && grupoParam && product.colors?.length) { const c = product.colors.find((c: any) => c.groupSlug === grupoParam); if (c) match = product.variations.find((v: any) => v.color?.name?.toLowerCase() === c.name?.toLowerCase()); }
    if (match) setSelectedVariation(match);
    setColorAutoSelected(true);
  }, [product, searchParams, colorAutoSelected]);

  // Sync URL on variation change
  useEffect(() => {
    if (!product || !colorAutoSelected) return;
    const currentCor = searchParams.get('cor') || '';
    const currentHex = searchParams.get('hex') || '';
    const newCor = selectedVariation?.color?.name || '';
    const newHex = selectedVariation?.color?.hex || '';
    if (currentCor === newCor && currentHex === newHex) return;
    const newParams = new URLSearchParams(searchParams);
    if (newCor) { newParams.set('cor', newCor); if (newHex) newParams.set('hex', newHex); else newParams.delete('hex'); newParams.delete('grupo'); }
    else { newParams.delete('cor'); newParams.delete('hex'); newParams.delete('grupo'); }
    setSearchParams(newParams, { replace: true });
  }, [selectedVariation, colorAutoSelected]);

  if (isLoading) return <><ProductDetailSkeleton /></>;

  if (isError || !product) {
    return (
      <>
        <EmptyState variant="products"
          title={isError ? "Erro ao carregar produto" : "Produto não encontrado"}
          description={isError ? "Não foi possível carregar os dados do produto." : "O produto não existe ou foi removido."}
          action={{ label: isError ? "Tentar novamente" : "Voltar para Vitrine", onClick: () => isError ? window.location.reload() : navigate("/") }}
        />
      </>
    );
  }

  const isFavorite = id ? isFavoriteCheck(id) : false;
  const handleFavorite = () => {
    if (!id) return;
    if (isFavorite) {
      const currentVariant = useFavoritesStore.getState().getFavoriteVariant(id);
      removeFavorite(id);
      showUndoToast({
        title: "Removido dos favoritos",
        description: product.name,
        onUndo: () => toggleFavorite(id, currentVariant),
      });
    } else {
      setFavPickerOpen(true);
    }
  };

  const handleFavoriteVariantSelected = (variant: any) => {
    if (!id) return;
    toggleFavorite(id, variant ? { color_name: variant.color_name, color_hex: variant.color_hex, size_code: variant.size_code, variant_id: variant.variant_id, thumbnail: variant.thumbnail } : undefined);
    toast({ title: "Adicionado aos favoritos", description: product.name });
  };

  return (
    <>
      <Helmet>
        <title>{product.name} | Brindes Sicoob</title>
        <meta name="description" content={product.description || `${product.name} - Brinde Promocional`} />
        <link rel="canonical" href={`${window.location.origin}/produto/${product.id}`} />
        <meta property="og:title" content={`${product.name} | Brindes Sicoob`} />
        <meta property="og:description" content={product.description || `${product.name} - Brinde Promocional`} />
        <meta property="og:image" content={product.og_image_url ? getCdnUrl(product.og_image_url, 'large') : (product.images[0] || '')} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`${window.location.origin}/produto/${product.id}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} | Brindes Sicoob`} />
        <meta name="twitter:image" content={product.og_image_url ? getCdnUrl(product.og_image_url, 'large') : (product.images[0] || '')} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org", "@type": "Product", "name": product.name,
            "description": product.description || `${product.name} - Brinde Promocional`,
            "sku": product.sku, "image": product.images?.filter(Boolean) || [],
            "brand": { "@type": "Brand", "name": product.supplier?.name || "Brindes Sicoob" },
            "offers": { "@type": "Offer", "price": product.price, "priceCurrency": "BRL",
              "availability": product.stockStatus === "in-stock" ? "https://schema.org/InStock" : product.stockStatus === "out-of-stock" ? "https://schema.org/OutOfStock" : "https://schema.org/LimitedAvailability",
              "seller": { "@type": "Organization", "name": "Brindes Sicoob" }
            },
            "category": product.category?.name, "material": product.materials?.join(", "),
          })}
        </script>
      </Helmet>

      <ProductStickyHeader productId={product.id} productName={product.name} productSku={product.sku}
        productPrice={product.price} productImage={product.images?.[0] || '/placeholder.svg'}
        minQuantity={product.minQuantity || 1} isFavorite={isFavorite} onToggleFavorite={handleFavorite} product={product}
      />

      <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 xl:space-y-8 animate-fade-in pb-20 md:pb-0 min-w-0 overflow-x-hidden xl:px-4 2xl:px-8">
        <IntelligenceBadges badges={intellBadges} turnoverScore={intellTurnover} isDemo={intellIsDemo} />

        <ProductDetailHero
          product={product} id={id || ''} selectedVariation={selectedVariation}
          setSelectedVariation={setSelectedVariation} isFavorite={isFavorite}
          onToggleFavorite={handleFavorite} viewCount={viewCount} supplierTrust={supplierTrust}
          onOpenPackagingModal={() => setPackagingModalOpen(true)}
          onOpenFutureStock={() => setFutureStockOpen(true)}
          onOpenSupplierComparison={() => setSupplierCompareOpen(true)}
        />

        <div className="pt-6 xl:pt-8 border-t border-border/60">
          <SimilarProducts currentProduct={product} />
        </div>

        {aiCandidates.length > 0 && (
          <div className="pt-6 xl:pt-8 border-t border-border/60">
            <SmartRecommendations
              currentProductId={product.id}
              candidateProducts={aiCandidates}
              maxResults={6}
              title="Recomendações inteligentes para este produto"
              onProductClick={(pid) => navigate(`/produto/${pid}`)}
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 xl:gap-6 pt-6 xl:pt-8 border-t border-border/60">
          <StockHistoryChart productId={product.id} productName={product.name} />
          <SalesHistoryChart productId={product.id} productSku={product.sku} productName={product.name} />
        </div>

        <SupplierComparisonModal product={product} open={supplierCompareOpen} onOpenChange={setSupplierCompareOpen} />
        <FutureStockModal open={futureStockOpen} onOpenChange={setFutureStockOpen} productId={product.id} productName={product.name} productSku={product.sku} />
        <PackagingModal isOpen={packagingModalOpen} onClose={() => setPackagingModalOpen(false)}
          packingType={product.packagingContext === 'with_customization' ? (product.repackingType || product.packingType) : product.packingType}
          packagingContext={product.packagingContext} boxImage={product.boxImage}
          boxWidthMm={product.boxWidthMm} boxHeightMm={product.boxHeightMm} boxLengthMm={product.boxLengthMm}
          boxWeightKg={product.boxWeightKg} boxQuantity={product.boxQuantity} boxVolumeCm3={product.boxVolumeCm3}
        />
      </div>

      <FloatingCompareBar />
      <MobileProductActions productId={product.id} productName={product.name} productSku={product.sku}
        productPrice={product.price} productImageUrl={product.images?.[0]} minQuantity={product.minQuantity || 1}
        isFavorite={isFavorite} onToggleFavorite={handleFavorite} product={product}
      />

      {id && (
        <VariantPickerDialog open={favPickerOpen} onOpenChange={setFavPickerOpen} productId={id}
          productName={product.name} mode="favorite" onComplete={handleFavoriteVariantSelected}
        />
      )}
    </>
  );
}
