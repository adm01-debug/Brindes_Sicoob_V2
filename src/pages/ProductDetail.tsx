import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getCdnUrl } from "@/utils/image-utils";
// import { MainLayout } from "@/components/layout/MainLayout";
import { ProductStickyHeader } from "@/components/products/ProductStickyHeader";
import { SimilarProducts } from "@/components/products/SimilarProducts";
import { SmartRecommendations } from "@/components/products/SmartRecommendations";
import { useSimilarProducts } from "@/hooks/useSimilarProducts";
import type { ProductForRecommendation } from "@/hooks/useAIRecommendations";
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
import { FloatingCompareBar } from "@/components/compare/FloatingCompareBar";
import { MobileProductActions } from "@/components/mobile/MobileProductActions";
import { useRecentlyViewedStore } from "@/stores/useRecentlyViewedStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { ProductDetailHero } from "./product-detail/ProductDetailHero";
import type { ProductVariation } from "@/types/product-catalog";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";

async function fetchProductViewCount(productId: string | undefined): Promise<number> {
  if (!productId) return 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { count } = await supabase.from("product_views").select("*", { count: "exact", head: true })
    .eq("product_id", productId).gte("created_at", thirtyDaysAgo.toISOString());
  return count ?? 0;
}

function matchingVariation(
  product: NonNullable<ReturnType<typeof useProduct>["data"]>,
  searchParams: URLSearchParams,
): ProductVariation | undefined {
  const colorName = searchParams.get('cor')?.toLowerCase().trim();
  const group = searchParams.get('grupo');
  const hex = searchParams.get('hex');
  if (!hasVariationQuery(colorName, group, hex)) return undefined;
  if (!product.variations?.length) return undefined;
  const exact = exactVariation(product.variations, colorName);
  if (exact) return exact;
  const partial = partialVariation(product.variations, colorName);
  if (partial) return partial;
  const byHex = hexVariation(product.variations, hex);
  if (byHex) return byHex;
  return groupVariation(product, group);
}

function hasVariationQuery(color: string | undefined, group: string | null, hex: string | null): boolean {
  return Boolean(color || group || hex);
}

function exactVariation(variations: ProductVariation[], color: string | undefined): ProductVariation | undefined {
  if (!color) return undefined;
  return variations.find((variation) => variation.color.name.toLowerCase().trim() === color);
}

function partialVariation(variations: ProductVariation[], color: string | undefined): ProductVariation | undefined {
  if (!color) return undefined;
  return variations.find((variation) => {
    const name = variation.color.name.toLowerCase().trim();
    return name.includes(color) || color.includes(name);
  });
}

function hexVariation(variations: ProductVariation[], hex: string | null): ProductVariation | undefined {
  if (!hex) return undefined;
  return variations.find((variation) => variation.color.hex.toLowerCase() === hex.toLowerCase());
}

function groupVariation(
  product: NonNullable<ReturnType<typeof useProduct>["data"]>,
  group: string | null,
): ProductVariation | undefined {
  if (!group) return undefined;
  const groupedColor = product.colors?.find((candidate) => candidate.groupSlug === group);
  if (!groupedColor) return undefined;
  return product.variations?.find((variation) => variation.color.name.toLowerCase() === groupedColor.name.toLowerCase());
}

function variationColor(variation: ProductVariation | null): string {
  return variation?.color?.name ?? '';
}

function variationHex(variation: ProductVariation | null): string {
  return variation?.color?.hex ?? '';
}

function variationSearchParams(current: URLSearchParams, variation: ProductVariation | null): URLSearchParams | null {
  const currentColor = current.get('cor') ?? '';
  const currentHex = current.get('hex') ?? '';
  const newColor = variationColor(variation);
  const newHex = variationHex(variation);
  if (currentColor === newColor && currentHex === newHex) return null;
  const next = new URLSearchParams(current);
  if (newColor) {
    next.set('cor', newColor);
    if (newHex) next.set('hex', newHex);
    else next.delete('hex');
  } else {
    next.delete('cor');
    next.delete('hex');
  }
  next.delete('grupo');
  return next;
}

function routeProductId(id: string | undefined): string { return id ?? ''; }

function favoriteState(id: string | undefined, check: (productId: string) => boolean): boolean {
  return id ? check(id) : false;
}

function recommendationCategory(itemCategory: string | null | undefined, productCategory: string | undefined): string {
  return itemCategory || productCategory || 'Brindes';
}

function catalogFlagsFor(product: ReturnType<typeof useProduct>["data"]) {
  if (!product) return undefined;
  return {
    featured: product.featured, newArrival: product.newArrival, onSale: product.onSale,
    lowStock: product.stockStatus === 'low-stock', stock: product.stock,
  };
}

function favoriteVariantPayload(variant: ExternalVariantStock | null) {
  if (!variant) return undefined;
  return { color_name: variant.color_name, color_hex: variant.color_hex, size_code: variant.size_code,
    variant_id: variant.id, thumbnail: variant.selected_thumbnail };
}

function ProductUnavailable({ failed, navigate }: { failed: boolean; navigate: ReturnType<typeof useNavigate> }) {
  const title = failed ? "Erro ao carregar produto" : "Produto não encontrado";
  const description = failed ? "Não foi possível carregar os dados do produto." : "O produto não existe ou foi removido.";
  const label = failed ? "Tentar novamente" : "Voltar para Vitrine";
  const action = () => { if (failed) window.location.reload(); else navigate('/'); };
  return <EmptyState variant="products" title={title} description={description} action={{ label, onClick: action }} />;
}

function useTrackViewedProduct(
  product: ReturnType<typeof useProduct>["data"],
  track: ReturnType<typeof useProductAnalytics>["trackProductView"],
  addRecent: (productId: string) => void,
): void {
  useEffect(() => {
    if (!product) return;
    track({ productId: product.id, productSku: product.sku, productName: product.name, viewType: "detail" });
    addRecent(product.id);
  }, [product, track, addRecent]);
}

function useVariationUrlSync(
  product: ReturnType<typeof useProduct>["data"],
  searchParams: URLSearchParams,
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  selectedVariation: ProductVariation | null,
  colorAutoSelected: boolean,
  setColorAutoSelected: Dispatch<SetStateAction<boolean>>,
  setSelectedVariation: Dispatch<SetStateAction<ProductVariation | null>>,
): void {
  useEffect(() => {
    if (!product || colorAutoSelected) return;
    const match = matchingVariation(product, searchParams);
    if (match) setSelectedVariation(match);
    setColorAutoSelected(true);
  }, [product, searchParams, colorAutoSelected, setColorAutoSelected, setSelectedVariation]);
  useEffect(() => {
    if (!product || !colorAutoSelected) return;
    const next = variationSearchParams(searchParams, selectedVariation);
    if (next) setSearchParams(next, { replace: true });
  }, [product, searchParams, selectedVariation, colorAutoSelected, setSearchParams]);
}

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

  const { data: product, isLoading, isError } = useProduct(routeProductId(id));
  const { data: similarItems = [] } = useSimilarProducts(product);
  const aiCandidates = useMemo<ProductForRecommendation[]>(
    () => similarItems.slice(0, 12).map((it) => ({
      id: it.id,
      name: it.name,
      category: recommendationCategory(it.category_name, product?.category?.name),
      priceRange: `R$ ${it.price.toFixed(2)}`,
      tags: [it.supplier_name].filter(Boolean) as string[],
    })),
    [similarItems, product?.category?.name]
  );
  const catalogFlags = useMemo(() => catalogFlagsFor(product), [product]);
  const { badges: intellBadges, turnoverScore: intellTurnover } = useProductIntelligenceBadges(id, catalogFlags);

  const { data: viewCount = 0 } = useQuery({
    queryKey: ["product-views-count", id],
    queryFn: () => fetchProductViewCount(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  useTrackViewedProduct(product, trackProductView, addToRecentlyViewed);
  useVariationUrlSync(product, searchParams, setSearchParams, selectedVariation, colorAutoSelected,
    setColorAutoSelected, setSelectedVariation);

  if (isLoading) return <ProductDetailSkeleton />;

  if (!product) return <ProductUnavailable failed={isError} navigate={navigate} />;

  const isFavorite = favoriteState(id, isFavoriteCheck);
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

  const handleFavoriteVariantSelected = (variant: ExternalVariantStock | null) => {
    if (!id) return;
    toggleFavorite(id, favoriteVariantPayload(variant));
    toast({ title: "Adicionado aos favoritos", description: product.name });
  };

  return <LoadedProductDetail
    product={product} id={id} isFavorite={isFavorite} onFavorite={handleFavorite}
    intelligenceBadges={intellBadges} turnoverScore={intellTurnover}
    selectedVariation={selectedVariation} setSelectedVariation={setSelectedVariation} viewCount={viewCount}
    aiCandidates={aiCandidates} navigate={navigate} supplierCompareOpen={supplierCompareOpen}
    setSupplierCompareOpen={setSupplierCompareOpen} futureStockOpen={futureStockOpen}
    setFutureStockOpen={setFutureStockOpen} packagingModalOpen={packagingModalOpen}
    setPackagingModalOpen={setPackagingModalOpen} favPickerOpen={favPickerOpen}
    setFavPickerOpen={setFavPickerOpen} onFavoriteVariant={handleFavoriteVariantSelected}
  />;
}

type LoadedProduct = NonNullable<ReturnType<typeof useProduct>["data"]>;
type Navigate = ReturnType<typeof useNavigate>;

interface LoadedProductDetailProps {
  product: LoadedProduct;
  id: string | undefined;
  isFavorite: boolean;
  onFavorite: () => void;
  intelligenceBadges: ReturnType<typeof useProductIntelligenceBadges>["badges"];
  turnoverScore: number | null;
  selectedVariation: ProductVariation | null;
  setSelectedVariation: Dispatch<SetStateAction<ProductVariation | null>>;
  viewCount: number;
  aiCandidates: ProductForRecommendation[];
  navigate: Navigate;
  supplierCompareOpen: boolean;
  setSupplierCompareOpen: Dispatch<SetStateAction<boolean>>;
  futureStockOpen: boolean;
  setFutureStockOpen: Dispatch<SetStateAction<boolean>>;
  packagingModalOpen: boolean;
  setPackagingModalOpen: Dispatch<SetStateAction<boolean>>;
  favPickerOpen: boolean;
  setFavPickerOpen: Dispatch<SetStateAction<boolean>>;
  onFavoriteVariant: (variant: ExternalVariantStock | null) => void;
}

function LoadedProductDetail({
  product, id, isFavorite, onFavorite, intelligenceBadges, turnoverScore,
  selectedVariation, setSelectedVariation, viewCount, aiCandidates, navigate,
  supplierCompareOpen, setSupplierCompareOpen, futureStockOpen, setFutureStockOpen,
  packagingModalOpen, setPackagingModalOpen, favPickerOpen, setFavPickerOpen, onFavoriteVariant,
}: LoadedProductDetailProps) {
  return (
    <>
      <ProductMetadata product={product} />

      <ProductStickyHeader productId={product.id} productName={product.name} productSku={product.sku}
        productPrice={product.price} productImage={product.images?.[0] || '/placeholder.svg'}
        minQuantity={product.minQuantity || 1} isFavorite={isFavorite} onToggleFavorite={onFavorite} product={product}
      />

      <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 xl:space-y-8 animate-fade-in pb-20 md:pb-0 min-w-0 overflow-x-hidden xl:px-4 2xl:px-8">
        <IntelligenceBadges badges={intelligenceBadges} turnoverScore={turnoverScore} />

        <ProductDetailHero
          product={product} id={id || ''} selectedVariation={selectedVariation}
          setSelectedVariation={setSelectedVariation} isFavorite={isFavorite}
          onToggleFavorite={onFavorite} viewCount={viewCount}
          onOpenPackagingModal={() => setPackagingModalOpen(true)}
          onOpenFutureStock={() => setFutureStockOpen(true)}
          onOpenSupplierComparison={() => setSupplierCompareOpen(true)}
        />

        <div className="pt-6 xl:pt-8 border-t border-border/60">
          <SimilarProducts currentProduct={product} />
        </div>

        <ProductRecommendations productId={product.id} candidates={aiCandidates} navigate={navigate} />

        <div className="grid md:grid-cols-2 gap-4 xl:gap-6 pt-6 xl:pt-8 border-t border-border/60">
          <StockHistoryChart productId={product.id} productName={product.name} />
          <SalesHistoryChart productId={product.id} productSku={product.sku} productName={product.name} />
        </div>

        <ProductDialogs product={product} supplierCompareOpen={supplierCompareOpen} setSupplierCompareOpen={setSupplierCompareOpen}
          futureStockOpen={futureStockOpen} setFutureStockOpen={setFutureStockOpen}
          packagingModalOpen={packagingModalOpen} setPackagingModalOpen={setPackagingModalOpen} />
      </div>

      <FloatingCompareBar />
      <MobileProductActions productId={product.id} productName={product.name} productSku={product.sku}
        productPrice={product.price} productImageUrl={product.images?.[0]} minQuantity={product.minQuantity || 1}
        isFavorite={isFavorite} onToggleFavorite={onFavorite} product={product}
      />

      {id && (
        <VariantPickerDialog open={favPickerOpen} onOpenChange={setFavPickerOpen} productId={id}
          productName={product.name} mode="favorite" onComplete={onFavoriteVariant}
        />
      )}
    </>
  );
}

function productDescription(product: LoadedProduct): string {
  return product.description || `${product.name} - Brinde Promocional`;
}

function productSocialImage(product: LoadedProduct): string {
  return product.og_image_url ? getCdnUrl(product.og_image_url, 'large') : (product.images[0] || '');
}

function productAvailability(status: LoadedProduct['stockStatus']): string {
  if (status === 'in-stock') return 'https://schema.org/InStock';
  if (status === 'out-of-stock') return 'https://schema.org/OutOfStock';
  return 'https://schema.org/LimitedAvailability';
}

function ProductMetadata({ product }: { product: LoadedProduct }) {
  const description = productDescription(product);
  const image = productSocialImage(product);
  return (
    <Helmet>
      <title>{product.name} | Brindes Sicoob</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`${window.location.origin}/produto/${product.id}`} />
      <meta property="og:title" content={`${product.name} | Brindes Sicoob`} />
      <meta property="og:description" content={description} /><meta property="og:image" content={image} />
      <meta property="og:type" content="product" /><meta property="og:url" content={`${window.location.origin}/produto/${product.id}`} />
      <meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content={`${product.name} | Brindes Sicoob`} />
      <meta name="twitter:image" content={image} />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org", "@type": "Product", name: product.name, description,
        sku: product.sku, image: product.images?.filter(Boolean) || [],
        brand: { "@type": "Brand", name: product.supplier?.name || "Brindes Sicoob" },
        offers: { "@type": "Offer", price: product.price, priceCurrency: "BRL", availability: productAvailability(product.stockStatus),
          seller: { "@type": "Organization", name: "Brindes Sicoob" } },
        category: product.category?.name, material: product.materials?.join(", "),
      })}</script>
    </Helmet>
  );
}

function ProductRecommendations({ productId, candidates, navigate }: {
  productId: string; candidates: ProductForRecommendation[]; navigate: Navigate;
}) {
  if (candidates.length === 0) return null;
  return <div className="pt-6 xl:pt-8 border-t border-border/60"><SmartRecommendations
    currentProductId={productId} candidateProducts={candidates} maxResults={6}
    title="Recomendações inteligentes para este produto" onProductClick={(id) => navigate(`/produto/${id}`)}
  /></div>;
}

function packagingType(product: LoadedProduct) {
  if (product.packagingContext === 'with_customization') return product.repackingType || product.packingType || null;
  return product.packingType ?? null;
}

function ProductDialogs({ product, supplierCompareOpen, setSupplierCompareOpen, futureStockOpen, setFutureStockOpen,
  packagingModalOpen, setPackagingModalOpen }: Pick<LoadedProductDetailProps,
    'product' | 'supplierCompareOpen' | 'setSupplierCompareOpen' | 'futureStockOpen' | 'setFutureStockOpen' |
    'packagingModalOpen' | 'setPackagingModalOpen'>) {
  return <>
    <SupplierComparisonModal product={product} open={supplierCompareOpen} onOpenChange={setSupplierCompareOpen} />
    <FutureStockModal open={futureStockOpen} onOpenChange={setFutureStockOpen} productId={product.id} productName={product.name} productSku={product.sku} />
    <PackagingModal isOpen={packagingModalOpen} onClose={() => setPackagingModalOpen(false)} packingType={packagingType(product)}
      packagingContext={product.packagingContext} boxImage={product.boxImage ?? null}
      boxWidthMm={product.boxWidthMm ?? null} boxHeightMm={product.boxHeightMm ?? null} boxLengthMm={product.boxLengthMm ?? null}
      boxWeightKg={product.boxWeightKg ?? null} boxQuantity={product.boxQuantity ?? null} boxVolumeCm3={product.boxVolumeCm3 ?? null} />
  </>;
}
