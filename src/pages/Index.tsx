// Catálogo de Produtos - Index Page (v3 - refactored)
import { useState, useRef } from "react";

import { PageSEO } from "@/components/seo/PageSEO";
import { FloatingCompareBar } from "@/components/compare/FloatingCompareBar";
import { SharePreviewDialog } from "@/components/products/share/SharePreviewDialog";
import { VariantPickerDialog } from "@/components/products/VariantPickerDialog";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { CatalogActiveFilters } from "@/components/catalog/CatalogActiveFilters";
import { CatalogContent } from "@/components/catalog/CatalogContent";
import { CatalogStorefrontHero } from "@/components/catalog/CatalogStorefrontHero";
import { useCatalogState } from "@/hooks/useCatalogState";
import { BannerCarousel } from "@/components/cms/BannerCarousel";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";

export default function Index() {
  const catalog = useCatalogState();
  const [variantForShare, setVariantForShare] = useState<ExternalVariantStock | null | undefined>(undefined);
  const variantSelectedRef = useRef(false);
  const shareDialogOpenRef = useRef(false);
  // undefined = picker not answered yet; null = "sem cor específica"; object = selected variant

  const scrollToCatalog = () => {
    document.getElementById("produtos-do-catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectPurchaseIntent = (query: string) => {
    catalog.handleSearch(query);
    requestAnimationFrame(scrollToCatalog);
  };

  const selectBudgetRange = (minimum: number, maximum: number) => {
    catalog.setFilters({ ...catalog.filters, priceRange: [minimum, maximum] });
    requestAnimationFrame(scrollToCatalog);
  };

  return (
    <>
      <PageSEO
        title="Loja de brindes para cooperativas"
        description="Encontre brindes, consulte preço e estoque, escolha a personalização e monte seu orçamento para a cooperativa."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Loja de brindes para cooperativas",
          description: "Portal de compras centralizado para produtos e brindes destinados às cooperativas Sicoob.",
          isPartOf: { "@type": "WebSite", name: "Portal de Compras Sicoob" },
        }}
      />
      <div>
        <div className="min-w-0 flex-1">
          <div className="animate-fade-in space-y-8">
            {!catalog.hasActiveCatalogConstraints && <CatalogStorefrontHero onBrowse={scrollToCatalog} onSelectIntent={selectPurchaseIntent} onSelectBudget={selectBudgetRange} />}

            {/* CMS Banners */}
            <BannerCarousel />

            <section id="produtos-do-catalogo" className="scroll-mt-28 space-y-4" aria-labelledby="catalog-heading">
              <CatalogHeader
                shouldShowCatalogSkeleton={catalog.shouldShowCatalogSkeleton}
                totalEstimate={catalog.totalEstimate}
                filteredCount={catalog.filteredProducts.length}
                hasNextPage={catalog.hasNextPage}
                searchQuery={catalog.searchQuery}
                activeFiltersCount={catalog.activeFiltersCount}
                searchHistory={catalog.history}
                onClearSearchHistory={catalog.clearHistory}
                historyScope={catalog.searchHistoryScope}
                onReset={catalog.resetFilters}
                onSelect={(result) => {
                  if (result.type === "product") {
                    catalog.navigate(`/produto/${result.id}`);
                  } else if (result.type === "category") {
                    catalog.setFilters({ ...catalog.filters, categories: [parseInt(result.id)] });
                  } else if (result.type === "supplier") {
                    catalog.setFilters({ ...catalog.filters, suppliers: [result.id] });
                  } else {
                    catalog.handleSearch(result.label);
                  }
                }}
              />

              {/* Toolbar: Filters + Sort + Stats + Layout — sticky abaixo do Header global.
                Usa --header-h + --breadcrumb-h (definidos por Header/MainLayout) para
                acompanhar a altura dinâmica em qualquer rota. */}
              <div className="sticky top-[calc(var(--header-h,56px)+var(--breadcrumb-h,0px))] z-20 -mx-3 border-y border-border/40 bg-background/95 px-3 py-2 backdrop-blur-md sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
                <CatalogToolbar
                  filters={catalog.filters}
                  setFilters={catalog.setFilters}
                  activeFiltersCount={catalog.activeFiltersCount}
                  filterSheetOpen={catalog.filterSheetOpen}
                  setFilterSheetOpen={catalog.setFilterSheetOpen}
                  resetFilters={catalog.resetFilters}
                  sortBy={catalog.sortBy}
                  setSortBy={catalog.setSortBy}
                  statBadges={catalog.statBadges}
                  viewMode={catalog.viewMode}
                  setViewMode={catalog.setViewMode}
                  gridColumns={catalog.gridColumns}
                  setGridColumns={catalog.setGridColumns}
                  selectionMode={catalog.selectionMode}
                  onToggleSelectionMode={catalog.toggleSelectionMode}
                  selectedCount={catalog.selectedCount}
                  isEnrichingColors={catalog.isEnrichingColors}
                  isPending={catalog.isPending}
                />
              </div>

              {/* Active filter badges */}
              <CatalogActiveFilters filters={catalog.filters} setFilters={catalog.setFilters} activeFiltersCount={catalog.activeFiltersCount} />

              {/* Product grid/list content */}
              <CatalogContent
                viewMode={catalog.viewMode}
                shouldShowCatalogSkeleton={catalog.shouldShowCatalogSkeleton}
                shouldShowEmptyState={catalog.shouldShowEmptyState}
                hasActiveCatalogConstraints={catalog.hasActiveCatalogConstraints}
                paginatedProducts={catalog.paginatedProducts}
                filteredProducts={catalog.filteredProducts}
                gridColumns={catalog.gridColumns}
                hasMoreProducts={catalog.hasMoreProducts}
                isLoadingMore={catalog.isLoadingMore}
                totalEstimate={catalog.totalEstimate}
                loadMoreRef={catalog.loadMoreRef}
                itemsPerPage={catalog.ITEMS_PER_PAGE}
                navigate={(path) => catalog.navigate(path)}
                handleViewProduct={catalog.handleViewProduct}
                handleShareProduct={catalog.handleShareProduct}
                handleFavoriteProduct={catalog.handleFavoriteProduct}
                isFavorite={catalog.isFavorite}
                toggleFavorite={catalog.toggleFavorite}
                isInCompare={catalog.isInCompare}
                onToggleCompare={catalog.toggleCompare}
                canAddToCompare={catalog.canAddMore}
                onLoadMore={catalog.loadMore}
                onResetFilters={catalog.resetFilters}
                selectionMode={catalog.selectionMode}
                onSelectedCountChange={catalog.setSelectedCount}
                activeColorFilter={
                  catalog.filters.colorGroups?.length > 0 || catalog.filters.colorVariations?.length > 0
                    ? {
                        groups: catalog.filters.colorGroups || [],
                        variations: catalog.filters.colorVariations || [],
                      }
                    : null
                }
              />
            </section>

            <section id="como-comprar" className="rounded-[2rem] bg-[#00464d] px-6 py-8 text-white sm:px-9 lg:flex lg:items-center lg:gap-10" aria-labelledby="como-comprar-title">
              <div className="lg:w-[34%]">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7de0d5]">Do produto ao pedido</p>
                <h2 id="como-comprar-title" className="mt-2 font-display text-3xl font-bold leading-tight">
                  Comprar ficou mais simples e seguro.
                </h2>
                <p className="mt-4 text-sm leading-6 text-white/75">A cooperativa acompanha cada decisão, enquanto o portal organiza disponibilidade, personalização, aprovação e verba.</p>
              </div>
              <ol className="mt-7 grid flex-1 gap-3 sm:grid-cols-2 lg:mt-0 lg:grid-cols-4">
                {[
                  ["Escolha", "Selecione produtos e quantidades."],
                  ["Personalize", "Defina aplicação e envie a marca."],
                  ["Valide", "Confira prazo, arte e orçamento."],
                  ["Acompanhe", "Siga a produção até a entrega."],
                ].map(([title, description], index) => (
                  <li key={title} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7de0d5] text-xs font-bold text-[#00464d]">{index + 1}</span>
                    <strong className="mt-5 block font-display text-sm">{title}</strong>
                    <span className="mt-1 block text-xs leading-5 text-white/70">{description}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>

      <FloatingCompareBar />

      {/* Step 1: Variant picker for share */}
      {catalog.shareProduct && variantForShare === undefined && (
        <VariantPickerDialog
          open
          onOpenChange={(open) => {
            if (!open && !variantSelectedRef.current && !shareDialogOpenRef.current) {
              catalog.setShareProduct(null);
            }
            variantSelectedRef.current = false;
          }}
          productId={catalog.shareProduct.id}
          productName={catalog.shareProduct.name}
          mode="share"
          onComplete={(variant) => {
            variantSelectedRef.current = true;
            setVariantForShare(variant ?? null);
          }}
        />
      )}

      {/* Step 2: Share dialog after variant is chosen */}
      {catalog.shareProduct && variantForShare !== undefined && (
        <SharePreviewDialog
          open
          onOpenChange={(open) => {
            shareDialogOpenRef.current = open;
            if (!open) {
              catalog.setShareProduct(null);
              setVariantForShare(undefined);
              variantSelectedRef.current = false;
            }
          }}
          product={catalog.shareProduct}
          selectedVariant={
            variantForShare
              ? {
                  variantName: variantForShare.color_name,
                  colorHex: variantForShare.color_hex,
                  thumbnailUrl: variantForShare.selected_thumbnail,
                }
              : null
          }
        />
      )}
    </>
  );
}
