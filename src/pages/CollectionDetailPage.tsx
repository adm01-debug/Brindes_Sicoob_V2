import { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Package, Trash2, Search, TrendingDown, FileText, ArrowUpDown, ArrowRight, CheckSquare, Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { PageSEO } from "@/components/seo/PageSEO";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ProductTableView } from "@/components/products/ProductTableView";
import { ProductListItem } from "@/components/products/ProductListItem";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkSelectionBar } from "@/components/common/BulkSelectionBar";
import { CollectionDetailHeader } from "@/components/collections/CollectionDetailHeader";
import { SortableProductItem } from "@/components/collections/SortableProductItem";
import { ShareCollectionDialog } from "@/components/collections/ShareCollectionDialog";
import { CollectionPresentationLauncher } from "@/components/collections/CollectionPresentationLauncher";
import { CollectionsTrashView } from "@/components/collections/CollectionsTrashView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCollectionsContext } from "@/contexts/CollectionsContext";
import { useProductsContext } from "@/contexts/ProductsContext";
import { useExternalCollections, useExternalCollectionProducts } from "@/hooks/useExternalCollections";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortOption = "name" | "sku" | "added";
type ViewMode = "grid" | "list" | "table";

function useCollectionDetailState() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const collectionsState = useCollectionsContext();
  const {
    collections, getCollectionProducts, getCollectionProductItems,
    removeProductFromCollection, reorderProducts, updateProductNotes, restoreFromTrash,
  } = collectionsState;
  const { getProductsByIds } = useProductsContext();
  const favorites = useFavoritesStore();
  const comparison = useComparisonStore();
  const [showPresentation, setShowPresentation] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("added");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionModeActive, setSelectionModeActive] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);
  const [manageMode, setManageMode] = useState(false);
  const [onlyDrops, setOnlyDrops] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "trash">("products");
  const [trashCount, setTrashCount] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const localCollection = useMemo(() => collections.find((item) => item.id === id), [collections, id]);
  const { data: externalCollections = [] } = useExternalCollections();
  const externalCollection = useMemo(() => localCollection ? null : externalCollections.find((item) => item.id === id) || null, [localCollection, externalCollections, id]);
  const isExternal = Boolean(externalCollection);
  const { data: externalProductLinks = [], isLoading: isLoadingExternalProducts } = useExternalCollectionProducts(isExternal ? id ?? null : null);
  const externalProductIds = useMemo(() => externalProductLinks.map((link) => link.product_id), [externalProductLinks]);
  const externalProducts = useMemo(() => isExternal ? getProductsByIds(externalProductIds) : [], [isExternal, externalProductIds, getProductsByIds]);
  const collection = useMemo(() => {
    if (localCollection) return { id: localCollection.id, name: localCollection.name, description: localCollection.description, color: localCollection.color, icon: localCollection.icon, isFeatured: localCollection.isFeatured, updatedAt: localCollection.updatedAt, isExternal: false as const };
    if (externalCollection) return { id: externalCollection.id, name: externalCollection.name, description: externalCollection.description || undefined, color: externalCollection.color || "#3B82F6", icon: externalCollection.icon || "📁", isFeatured: externalCollection.is_featured || false, updatedAt: externalCollection.updated_at, isExternal: true as const };
    return null;
  }, [localCollection, externalCollection]);
  const products = useMemo(() => {
    if (!id) return [];
    return isExternal ? externalProducts : getCollectionProducts(id);
  }, [id, isExternal, externalProducts, getCollectionProducts]);
  const collectionItems = useMemo(() => !id || isExternal ? [] : getCollectionProductItems(id), [id, isExternal, getCollectionProductItems]);
  const variantMap = useMemo(() => {
    const map = new Map<string, { color_name?: string | null; color_hex?: string | null; thumbnail?: string | null }>();
    collectionItems.forEach((item) => { if (item.variant) map.set(item.productId, item.variant); });
    return map;
  }, [collectionItems]);
  const priceAtSaveMap = useMemo(() => new Map(collectionItems.map((item) => [item.productId, item.priceAtSave ?? null])), [collectionItems]);
  const addedAtMap = useMemo(() => new Map(collectionItems.map((item) => [item.productId, item.addedAt ?? null])), [collectionItems]);
  const notesMap = useMemo(() => new Map(collectionItems.map((item) => [item.productId, item.notes])), [collectionItems]);
  const isSelectionMode = selectionModeActive || selectedIds.size > 0;
  const toggleSelect = useCallback((productId: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(productId)) next.delete(productId); else next.add(productId);
    return next;
  }), []);
  const toggleSelectAll = useCallback(() => setSelectedIds((current) => current.size === products.length ? new Set() : new Set(products.map((product) => product.id))), [products]);
  const clearSelection = useCallback(() => { setSelectedIds(new Set()); setSelectionModeActive(false); }, []);
  const toggleSelectionMode = useCallback(() => {
    if (selectionModeActive) setSelectedIds(new Set());
    setSelectionModeActive(!selectionModeActive);
  }, [selectionModeActive]);
  const handleBulkRemove = useCallback(() => {
    if (!id || selectedIds.size === 0) return;
    selectedIds.forEach((productId) => removeProductFromCollection(id, productId));
    toast.success(`${selectedIds.size} produto(s) removido(s)`);
    setSelectedIds(new Set());
  }, [id, selectedIds, removeProductFromCollection]);
  const handleBulkQuote = useCallback(() => {
    if (!collection || selectedIds.size === 0) return;
    const preloadProducts = products.filter((product) => selectedIds.has(product.id)).map((product) => ({ product_id: product.id, product_name: product.name, product_sku: product.sku || null, product_image_url: product.images?.[0] || null, unit_price: product.price || 0, quantity: 1, color_name: variantMap.get(product.id)?.color_name || null, color_hex: variantMap.get(product.id)?.color_hex || null }));
    navigate("/orcamentos/novo", { state: { fromCollection: collection.name, preloadProducts } });
  }, [collection, selectedIds, products, variantMap, navigate]);
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = query ? products.filter((product) => product.name.toLowerCase().includes(query) || product.sku?.toLowerCase().includes(query) || product.brand?.toLowerCase().includes(query)) : products;
    if (onlyDrops) filtered = filtered.filter((product) => {
      const saved = priceAtSaveMap.get(product.id);
      return Boolean(saved && product.price && ((product.price - saved) / saved) * 100 <= -2);
    });
    if (sortBy === "name") return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "sku") return [...filtered].sort((a, b) => (a.sku || "").localeCompare(b.sku || ""));
    return filtered;
  }, [products, searchQuery, sortBy, onlyDrops, priceAtSaveMap]);
  const priceDropCount = useMemo(() => products.filter((product) => {
    const saved = priceAtSaveMap.get(product.id);
    return Boolean(saved && product.price && ((product.price - saved) / saved) * 100 <= -2);
  }).length, [products, priceAtSaveMap]);
  const productsWithVariant = useMemo(() => filteredProducts.map((product) => {
    const thumbnail = variantMap.get(product.id)?.thumbnail;
    return thumbnail ? { ...product, images: [thumbnail, ...product.images] } : product;
  }), [filteredProducts, variantMap]);
  const updatedAgo = useMemo(() => {
    if (!collection?.updatedAt) return null;
    try { return formatDistanceToNow(new Date(collection.updatedAt), { addSuffix: true, locale: ptBR }); } catch { return null; }
  }, [collection?.updatedAt]);
  const handleRemoveFromCollection = useCallback((productId: string) => {
    if (!collection) return;
    removeProductFromCollection(collection.id, productId);
    setAnnouncement(`Produto removido da coleção ${collection.name}`);
    toast.success("Produto removido da coleção", { action: { label: "Desfazer", onClick: async () => {
      const restored = await restoreFromTrash(collection.id, productId);
      if (!restored) { toast.error("Não foi possível restaurar"); return; }
      setAnnouncement("Produto restaurado"); toast.success("Produto restaurado");
    } } });
  }, [collection, removeProductFromCollection, restoreFromTrash]);
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!collection || !event.over || event.active.id === event.over.id) return;
    const oldIndex = filteredProducts.findIndex((product) => product.id === event.active.id);
    const newIndex = filteredProducts.findIndex((product) => product.id === event.over?.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderProducts(collection.id, arrayMove(filteredProducts.map((product) => product.id), oldIndex, newIndex));
  }, [collection, filteredProducts, reorderProducts]);
  const handleCreateQuote = useCallback(() => {
    if (!collection) return;
    const local = collections.find((item) => item.id === collection.id);
    const preloadProducts = products.map((product) => ({ product_id: product.id, product_name: product.name, product_sku: product.sku, product_image_url: product.images?.[0] || null, unit_price: product.price || 0, quantity: 1, color_name: variantMap.get(product.id)?.color_name || null, color_hex: variantMap.get(product.id)?.color_hex || null }));
    navigate("/orcamentos/novo", { state: { fromCollection: collection.name, clientId: local?.clientId ?? null, clientName: local?.clientName ?? null, preloadProducts } });
  }, [collection, collections, products, variantMap, navigate]);
  return { id, navigate, collection, localCollection, isExternal, isLoadingExternalProducts, products, filteredProducts, productsWithVariant, variantMap, priceAtSaveMap, addedAtMap, notesMap, updatedAgo, searchQuery, setSearchQuery, sortBy, setSortBy, selectedIds, isSelectionMode, toggleSelect, toggleSelectAll, clearSelection, toggleSelectionMode, handleBulkRemove, handleBulkQuote, viewMode, setViewMode, gridColumns, setGridColumns, manageMode, setManageMode, onlyDrops, setOnlyDrops, priceDropCount, announcement, activeTab, setActiveTab, trashCount, setTrashCount, sensors, handleRemoveFromCollection, handleDragEnd, handleCreateQuote, updateProductNotes, favorites, comparison, showPresentation, setShowPresentation, showShareDialog, setShowShareDialog };
}

type DetailState = ReturnType<typeof useCollectionDetailState>;
type DetailCollection = NonNullable<DetailState["collection"]>;
type DetailProps = { state: DetailState; collection: DetailCollection };

function LoadingCollection() {
  return <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-16 w-full" /><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">{[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="aspect-square rounded-xl" />)}</div></div>;
}

function MissingCollection({ state }: { state: DetailState }) {
  return <div className="text-center py-16"><h2 className="font-display text-xl font-semibold mb-4">Coleção não encontrada</h2><Button onClick={() => state.navigate("/colecoes")}>Voltar para coleções</Button></div>;
}

function CollectionBulkBar({ state, collection }: DetailProps) {
  const count = state.selectedIds.size;
  const actions = <><motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}><Button size="default" className="gap-2 font-semibold shadow-lg hover:shadow-xl transition-shadow" onClick={state.handleBulkQuote}><FileText className="h-4 w-4" />Orçamento ({count})<ArrowRight className="h-4 w-4" /></Button></motion.div><motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}><Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={state.handleBulkRemove}><Trash2 className="h-3.5 w-3.5" />Remover</Button></motion.div></>;
  return <BulkSelectionBar isActive={state.isSelectionMode} selectedCount={count} label={`${count} produto${count > 1 ? "s" : ""} selecionado${count > 1 ? "s" : ""}`} subtitle={`Da coleção "${collection.name}"`} totalCount={state.products.length} onSelectAll={state.toggleSelectAll} onClear={state.clearSelection} actions={actions} />;
}

function sortOptionLabel(sortBy: SortOption) {
  if (sortBy === "name") return "Nome";
  if (sortBy === "sku") return "SKU";
  return "Adicionados";
}

function LocalToolbarActions({ state }: { state: DetailState }) {
  if (state.isExternal) return null;
  return <><Button variant={state.isSelectionMode ? "default" : "outline"} size="sm" className="gap-2" onClick={state.toggleSelectionMode}><CheckSquare className="h-3.5 w-3.5" />{state.isSelectionMode ? "Selecionando" : "Selecionar"}</Button><Button variant={state.manageMode ? "default" : "outline"} size="sm" className="gap-2" onClick={() => state.setManageMode((value) => !value)}><Settings2 className="h-3.5 w-3.5" />{state.manageMode ? "Gerenciando" : "Gerenciar"}</Button>{state.priceDropCount > 0 && <Button variant={state.onlyDrops ? "default" : "outline"} size="sm" className="gap-2" onClick={() => state.setOnlyDrops((value) => !value)}><TrendingDown className="h-3.5 w-3.5" />Só com queda ({state.priceDropCount})</Button>}</>;
}

function CollectionToolbar({ state }: { state: DetailState }) {
  if (state.products.length === 0) return null;
  const productCount = state.filteredProducts.length === state.products.length ? `${state.products.length} produtos` : `${state.filteredProducts.length} de ${state.products.length}`;
  return <div className="flex items-center gap-3 flex-wrap"><div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar na coleção" placeholder="Buscar na coleção..." value={state.searchQuery} onChange={(event) => state.setSearchQuery(event.target.value)} className="pl-9" /></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2"><ArrowUpDown className="h-3.5 w-3.5" />{sortOptionLabel(state.sortBy)}</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => state.setSortBy("added")}>Ordem de adição</DropdownMenuItem><DropdownMenuItem onClick={() => state.setSortBy("name")}>Nome A-Z</DropdownMenuItem><DropdownMenuItem onClick={() => state.setSortBy("sku")}>SKU</DropdownMenuItem></DropdownMenuContent></DropdownMenu><LocalToolbarActions state={state} /><div className="hidden sm:block"><LayoutPopover viewMode={state.viewMode} setViewMode={state.setViewMode} gridColumns={state.gridColumns} setGridColumns={state.setGridColumns} /></div><p className="text-sm text-muted-foreground">{productCount}</p></div>;
}

function LocalManageProducts({ state, collection }: DetailProps) {
  return <DndContext sensors={state.sensors} collisionDetection={closestCenter} onDragEnd={state.handleDragEnd}><SortableContext items={state.filteredProducts.map((product) => product.id)} strategy={verticalListSortingStrategy}><div className="space-y-2">{state.filteredProducts.map((product) => <SortableProductItem key={product.id} product={product} variant={state.variantMap.get(product.id)} priceAtSave={state.priceAtSaveMap.get(product.id)} addedAt={state.addedAtMap.get(product.id)} notes={state.notesMap.get(product.id)} onNotesChange={(notes) => state.updateProductNotes(collection.id, product.id, notes)} isSelected={state.selectedIds.has(product.id)} onToggleSelect={() => state.toggleSelect(product.id)} onRemove={() => state.handleRemoveFromCollection(product.id)} />)}</div></SortableContext></DndContext>;
}

function LocalProductView({ state }: { state: DetailState }) {
  if (state.viewMode === "table") return <ProductTableView products={state.productsWithVariant} onProductClick={(productId) => state.navigate(`/produto/${productId}`)} isFavorite={state.favorites.isFavorite} onToggleFavorite={state.favorites.toggleFavorite} isInCompare={state.comparison.isInCompare} onToggleCompare={state.comparison.toggleCompare} canAddToCompare={state.comparison.canAddMore} selectionMode={state.isSelectionMode} selectedIds={state.selectedIds} onToggleSelect={state.toggleSelect} />;
  if (state.viewMode === "list") return <div className="space-y-1.5">{state.productsWithVariant.map((product) => <ProductListItem key={product.id} product={product} onClick={() => state.navigate(`/produto/${product.id}`)} isFavorited={state.favorites.isFavorite(product.id)} onToggleFavorite={state.favorites.toggleFavorite} isInCompare={state.comparison.isInCompare(product.id)} onToggleCompare={state.comparison.toggleCompare} canAddToCompare={state.comparison.canAddMore} />)}</div>;
  return <ProductGrid products={state.productsWithVariant} onProductClick={(productId) => state.navigate(`/produto/${productId}`)} isFavorite={state.favorites.isFavorite} onToggleFavorite={state.favorites.toggleFavorite} isInCompare={state.comparison.isInCompare} onToggleCompare={state.comparison.toggleCompare} canAddToCompare={state.comparison.canAddMore} columns={state.gridColumns} selectionMode={state.isSelectionMode} selectedIds={state.selectedIds} onToggleSelect={state.toggleSelect} />;
}

function EmptyLocalProducts({ state }: { state: DetailState }) {
  return <div className="text-center py-16 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10"><Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" /><h3 className="font-display text-lg font-semibold text-foreground mb-2">Coleção vazia</h3><p className="text-muted-foreground mb-6 max-w-md mx-auto">Adicione produtos a esta coleção clicando no ícone de pasta nos cards de produto</p><Button onClick={() => state.navigate("/")}>Explorar produtos</Button></div>;
}

function LocalProductsResult({ state, collection }: DetailProps) {
  if (state.products.length === 0) return <EmptyLocalProducts state={state} />;
  if (state.filteredProducts.length === 0) return <div className="text-center py-12 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10"><Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><h3 className="font-display text-lg font-semibold mb-1">Nenhum produto encontrado</h3><p className="text-muted-foreground text-sm">{state.onlyDrops ? "Nenhum produto com queda de preço" : `Nenhum produto corresponde a "${state.searchQuery}"`}</p></div>;
  if (state.manageMode) return <LocalManageProducts state={state} collection={collection} />;
  return <LocalProductView state={state} />;
}

function LocalCollectionContent({ state, collection }: DetailProps) {
  return <Tabs value={state.activeTab} onValueChange={(value) => state.setActiveTab(value as "products" | "trash")} className="space-y-4"><TabsList><TabsTrigger value="products" className="gap-1.5"><Package className="h-3.5 w-3.5" />Produtos ({state.products.length})</TabsTrigger><TabsTrigger value="trash" className="gap-1.5"><Trash2 className="h-3.5 w-3.5" />Lixeira{state.trashCount > 0 && ` (${state.trashCount})`}</TabsTrigger></TabsList><TabsContent value="products" className="space-y-4"><LocalProductsResult state={state} collection={collection} /></TabsContent><TabsContent value="trash"><CollectionsTrashView collectionId={collection.id} onCountChange={state.setTrashCount} /></TabsContent></Tabs>;
}

function ExternalCollectionContent({ state }: { state: DetailState }) {
  if (state.products.length === 0) return <div className="text-center py-16 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10"><Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" /><h3 className="font-display text-lg font-semibold text-foreground mb-2">Nenhum produto nesta coleção</h3><p className="text-muted-foreground mb-6 max-w-md mx-auto">Esta coleção do catálogo ainda não possui produtos vinculados.</p><Button onClick={() => state.navigate("/colecoes")}>Voltar para coleções</Button></div>;
  if (state.viewMode === "table") return <ProductTableView products={state.productsWithVariant} onProductClick={(productId) => state.navigate(`/produto/${productId}`)} isFavorite={state.favorites.isFavorite} onToggleFavorite={state.favorites.toggleFavorite} isInCompare={state.comparison.isInCompare} onToggleCompare={state.comparison.toggleCompare} canAddToCompare={state.comparison.canAddMore} />;
  if (state.viewMode === "list") return <div className="space-y-1.5">{state.productsWithVariant.map((product) => <ProductListItem key={product.id} product={product} onClick={() => state.navigate(`/produto/${product.id}`)} isFavorited={state.favorites.isFavorite(product.id)} onToggleFavorite={state.favorites.toggleFavorite} isInCompare={state.comparison.isInCompare(product.id)} onToggleCompare={state.comparison.toggleCompare} canAddToCompare={state.comparison.canAddMore} />)}</div>;
  return <ProductGrid products={state.productsWithVariant} onProductClick={(productId) => state.navigate(`/produto/${productId}`)} isFavorite={state.favorites.isFavorite} onToggleFavorite={state.favorites.toggleFavorite} isInCompare={state.comparison.isInCompare} onToggleCompare={state.comparison.toggleCompare} canAddToCompare={state.comparison.canAddMore} columns={state.gridColumns} />;
}

function CollectionOverlays({ state, collection }: DetailProps) {
  return <>{state.showPresentation && state.products.length > 0 && <CollectionPresentationLauncher products={state.products} collectionName={collection.name} onClose={() => state.setShowPresentation(false)} />}{state.localCollection && <ShareCollectionDialog open={state.showShareDialog} onClose={() => state.setShowShareDialog(false)} collectionId={state.localCollection.id} collectionName={state.localCollection.name} shareToken={state.localCollection.shareToken} shareExpiresAt={state.localCollection.shareExpiresAt} isPublic={state.localCollection.isPublic} />}</>;
}

function LoadedCollection({ state, collection }: DetailProps) {
  return <><PageSEO title={`Coleção: ${collection.name}`} description={`Explore os produtos da coleção ${collection.name}.`} path={`/colecoes/${state.id}`} noIndex /><div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in"><CollectionDetailHeader collection={{ ...collection, clientName: state.localCollection?.clientName ?? null }} productCount={state.products.length} isLoading={state.isExternal && state.isLoadingExternalProducts} updatedAgo={state.updatedAgo} products={state.products} variantMap={state.variantMap} notesMap={state.notesMap} onBack={() => state.navigate("/colecoes")} onCreateQuote={state.handleCreateQuote} onPresent={() => state.setShowPresentation(true)} onShare={() => state.setShowShareDialog(true)} showShare={!state.isExternal} /><div role="status" aria-live="polite" className="sr-only">{state.announcement}</div><CollectionBulkBar state={state} collection={collection} /><CollectionToolbar state={state} />{state.isExternal ? <ExternalCollectionContent state={state} /> : <LocalCollectionContent state={state} collection={collection} />}</div><CollectionOverlays state={state} collection={collection} /></>;
}

export default function CollectionDetailPage() {
  const state = useCollectionDetailState();
  if (state.isExternal && state.isLoadingExternalProducts) return <LoadingCollection />;
  if (!state.collection) return <MissingCollection state={state} />;
  return <LoadedCollection state={state} collection={state.collection} />;
}
