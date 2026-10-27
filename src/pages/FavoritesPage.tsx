import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useFavoritesStore, type FavoriteVariantInfo } from "@/stores/useFavoritesStore";
import {
  useFavoriteLists,
  useFavoriteTrash,
  useLegacyFavoritesMigration,
} from "@/hooks/useFavoriteLists";
import { useEnrichedFavoriteItems } from "@/hooks/useEnrichedFavoriteItems";
import { useProductsContext } from "@/contexts/ProductsContext";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductListItem } from "@/components/products/ProductListItem";
import { ProductTableView } from "@/components/products/ProductTableView";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { getGridColsClass, getGridGapClass } from "@/components/replenishments/VirtualizedReplenishmentGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Heart, Trash2, Search, Package, Layers, TrendingDown, TrendingUp,
  CheckSquare, X, FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { DeleteConfirmDialog } from "@/components/common/ConfirmDialog";

import { useCatalogSelection } from "@/components/catalog/useCatalogSelection";
import { CatalogBulkModals } from "@/components/catalog/CatalogBulkModals";
import { FavoriteListsSidebar } from "@/components/favorites/FavoriteListsSidebar";
import { FavoritesTrashView } from "@/components/favorites/FavoritesTrashView";
import { FavoritesViewHeader } from "@/components/favorites/FavoritesViewHeader";
import { ItemNoteEditor } from "@/components/favorites/ItemNoteEditor";
import { PriceDropBadge } from "@/components/favorites/PriceDropBadge";
import { FavoritesEmptyStateSmart } from "@/components/favorites/FavoritesEmptyStateSmart";
import { FavoritePresentationLauncher } from "@/components/favorites/FavoritePresentationLauncher";
import { useFavoritesGlobalShortcuts } from "@/hooks/useFavoritesGlobalShortcuts";
import { useUndoStack } from "@/hooks/useUndoStack";
import type { FavoritesSort } from "@/components/favorites/FavoritesSortBar";
import type { Product } from "@/hooks/useProducts";

type ViewMode = "grid" | "list" | "table";
const VIEW_MODE_KEY = "favorites-view-mode";
const GRID_COLS_KEY = "favorites-grid-cols";
const SELECTED_LIST_KEY = "favorites-selected-list-id";
const SORT_KEY = "favorites-sort";
const PRICE_DROP_FILTER_KEY = "favorites-only-drops";

type FavoritePriceMeta = { priceDiffPct: number | null; priceAtSave: number | null; savedAt: string };
type FavoriteNoteMeta = { itemId: string; note: string | null };

function UnavailableFavoriteCard({
  productId,
  onRetry,
  onRemove,
}: {
  productId: string;
  onRetry: () => void;
  onRemove: () => void;
}) {
  return (
    <article
      data-testid="favorite-item"
      data-product-id={productId}
      className="flex min-h-44 flex-col justify-between rounded-xl border border-dashed border-border bg-card p-4"
      aria-label="Favorito salvo; detalhes do produto indisponíveis"
    >
      <div>
        <Package className="mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-semibold text-foreground">Produto salvo</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Não foi possível carregar os detalhes agora.
        </p>
        <p className="mt-1 break-all text-xs text-muted-foreground">ID: {productId}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="favorite-remove"
          aria-label="Remover favorito indisponível"
          onClick={onRemove}
        >
          Remover
        </Button>
      </div>
    </article>
  );
}

function matchesFavoriteSearch(product: Product, searchQuery: string): boolean {
  const query = searchQuery.toLowerCase();
  return product.name.toLowerCase().includes(query)
    || Boolean(product.sku?.toLowerCase().includes(query))
    || Boolean(product.brand?.toLowerCase().includes(query));
}

function hasPriceDrop(product: Product, metaMap: Map<string, FavoritePriceMeta>): boolean {
  const difference = metaMap.get(product.id)?.priceDiffPct;
  return typeof difference === 'number' && difference < -2;
}

function sortFavoriteProducts(products: Product[], sort: FavoritesSort): Product[] {
  const sorted = [...products];
  switch (sort) {
    case 'price-asc': return sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    case 'price-desc': return sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case 'name-asc': return sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    case 'name-desc': return sorted.sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
    case 'category': return sorted.sort((a, b) => (a.category_name ?? '').localeCompare(b.category_name ?? '', 'pt-BR'));
    case 'oldest': return sorted.reverse();
    default: return sorted;
  }
}

interface FavoriteFilterOptions {
  searchQuery: string;
  onlyPriceDrops: boolean;
  isRemoteListView: boolean;
  metaMap: Map<string, FavoritePriceMeta>;
  sort: FavoritesSort;
}

function filterFavoriteProducts(products: Product[], options: FavoriteFilterOptions): Product[] {
  let filtered = options.searchQuery.trim()
    ? products.filter((product) => matchesFavoriteSearch(product, options.searchQuery))
    : products;
  if (options.onlyPriceDrops && options.isRemoteListView) {
    filtered = filtered.filter((product) => hasPriceDrop(product, options.metaMap));
  }
  return sortFavoriteProducts(filtered, options.sort);
}

function loadViewMode(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_MODE_KEY);
    if (v === "grid" || v === "list" || v === "table") return v;
  } catch (error) {
    logger.warn("Não foi possível ler o modo de exibição dos favoritos", error);
  }
  return "grid";
}

function loadGridColumns(): ColumnCount {
  try {
    const v = localStorage.getItem(GRID_COLS_KEY);
    if (v) {
      const n = Number(v) as ColumnCount;
      if ([3, 4, 5, 6, 8].includes(n)) return n;
    }
  } catch (error) {
    logger.warn("Não foi possível ler as colunas dos favoritos", error);
  }
  return getDefaultColumns();
}

function loadSort(): FavoritesSort {
  try {
    const v = localStorage.getItem(SORT_KEY) as FavoritesSort | null;
    const allowed: FavoritesSort[] = ["recent", "oldest", "price-asc", "price-desc", "name-asc", "name-desc", "category"];
    if (v && allowed.includes(v)) return v;
  } catch (error) {
    logger.warn("Não foi possível ler a ordenação dos favoritos", error);
  }
  return "recent";
}

export default function FavoritesPage() {
  const navigate = useNavigate();

  // Atalhos globais (G L / Shift+F) + Cmd+Z undo stack
  useFavoritesGlobalShortcuts();
  useUndoStack();

  // Migra favoritos do localStorage para a nuvem (idempotente)
  useLegacyFavoritesMigration();

  // Store legado (SSOT para "Todos" enquanto não escolher lista remota)
  const { favorites, clearFavorites, favoriteCount, toggleFavorite, isFavorite } = useFavoritesStore();

  // Listas remotas + lixeira
  const {
    lists,
    createList,
    updateList,
    deleteList,
    generateShareToken,
    revokeShareToken,
  } = useFavoriteLists();
  const { items: trashItems } = useFavoriteTrash();

  // Estado: lista selecionada (null = view legado/todos) + lixeira
  const [selectedListId, setSelectedListId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SELECTED_LIST_KEY);
    } catch (error) {
      logger.warn("Não foi possível ler a lista de favoritos selecionada", error);
      return null;
    }
  });
  const [showTrash, setShowTrash] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [ariaAnnouncement, setAriaAnnouncement] = useState("");
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [removeSelectedDialogOpen, setRemoveSelectedDialogOpen] = useState(false);

  useEffect(() => {
    try {
      if (selectedListId) localStorage.setItem(SELECTED_LIST_KEY, selectedListId);
      else localStorage.removeItem(SELECTED_LIST_KEY);
    } catch (error) {
      logger.warn("Não foi possível salvar a lista de favoritos selecionada", error);
    }
  }, [selectedListId]);

  // Items enriquecidos da lista remota selecionada
  const { enriched, rawItems, removeItem, updateItem } = useEnrichedFavoriteItems(selectedListId);
  const isRemoteListView = !!selectedListId && !showTrash;

  const { getProductsByIds, products: _cacheSignal } = useProductsContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [gridColumns, setGridColumns] = useState<ColumnCount>(() => loadGridColumns());
  const [sort, setSort] = useState<FavoritesSort>(() => loadSort());
  const [selectionMode, setSelectionMode] = useState(false);
  const [onlyPriceDrops, setOnlyPriceDrops] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PRICE_DROP_FILTER_KEY) === "1";
    } catch (error) {
      logger.warn("Não foi possível ler o filtro de queda de preço", error);
      return false;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); }
    catch (error) { logger.warn("Não foi possível salvar o modo dos favoritos", error); }
  }, [viewMode]);
  useEffect(() => {
    try { localStorage.setItem(GRID_COLS_KEY, String(gridColumns)); }
    catch (error) { logger.warn("Não foi possível salvar as colunas dos favoritos", error); }
  }, [gridColumns]);
  useEffect(() => {
    try { localStorage.setItem(SORT_KEY, sort); }
    catch (error) { logger.warn("Não foi possível salvar a ordenação dos favoritos", error); }
  }, [sort]);
  useEffect(() => {
    try { localStorage.setItem(PRICE_DROP_FILTER_KEY, onlyPriceDrops ? "1" : "0"); }
    catch (error) { logger.warn("Não foi possível salvar o filtro de queda de preço", error); }
  }, [onlyPriceDrops]);

  // Mapa product_id → meta enriquecida (para badges + filtro de queda)
  const enrichedMetaMap = useMemo(() => {
    const m = new Map<string, FavoritePriceMeta>();
    if (isRemoteListView) {
      enriched.forEach((e) => {
        m.set(e.item.product_id, {
          priceDiffPct: e.priceDiffPct,
          priceAtSave: e.item.price_at_save,
          savedAt: e.item.added_at,
        });
      });
    }
    return m;
  }, [enriched, isRemoteListView]);

  const priceDropCount = useMemo(() => {
    if (!isRemoteListView) return null;
    return enriched.filter((e) => e.priceDiffPct !== null && e.priceDiffPct < -2).length;
  }, [enriched, isRemoteListView]);

  // ===== Produtos da view ativa =====
  const legacyFavoriteProducts = useMemo(
    () => getProductsByIds(favorites.map((f) => f.productId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getProductsByIds, favorites, _cacheSignal]
  );

  const variantMap = useMemo(() => {
    const map = new Map<string, FavoriteVariantInfo>();
    if (isRemoteListView) {
      enriched.forEach((e) => {
        if (e.item.variant_info) {
          map.set(e.item.product_id, e.item.variant_info as FavoriteVariantInfo);
        }
      });
    } else {
      favorites.forEach((f) => {
        if (f.variant) map.set(f.productId, f.variant);
      });
    }
    return map;
  }, [favorites, enriched, isRemoteListView]);

  // Map de notas (apenas remoto)
  const noteMap = useMemo(() => {
    const m = new Map<string, FavoriteNoteMeta>();
    if (isRemoteListView) {
      rawItems.forEach((it) => m.set(it.product_id, { itemId: it.id, note: it.note }));
    }
    return m;
  }, [rawItems, isRemoteListView]);

  const productsWithVariant = useMemo(() => {
    return isRemoteListView
      ? enriched.map((e) => e.productWithVariant).filter((p): p is NonNullable<typeof p> => !!p)
      : legacyFavoriteProducts.map((product) => {
          const variant = variantMap.get(product.id);
          if (variant?.thumbnail) {
            return { ...product, images: [variant.thumbnail, ...(product.images || [])] };
          }
          return product;
        });
  }, [enriched, legacyFavoriteProducts, variantMap, isRemoteListView]);

  const resolvedProductIds = useMemo(
    () => new Set(productsWithVariant.map((product) => product.id)),
    [productsWithVariant],
  );
  const unavailableFavoriteIds = isRemoteListView
    ? rawItems.filter((item) => !resolvedProductIds.has(item.product_id)).map((item) => item.product_id)
    : favorites.filter((favorite) => !resolvedProductIds.has(favorite.productId)).map((favorite) => favorite.productId);

  const filteredProducts = useMemo(() => filterFavoriteProducts(productsWithVariant, {
    searchQuery,
    onlyPriceDrops,
    isRemoteListView,
    metaMap: enrichedMetaMap,
    sort,
  }), [productsWithVariant, searchQuery, sort, onlyPriceDrops, isRemoteListView, enrichedMetaMap]);

  // Bulk selection
  const sel = useCatalogSelection(filteredProducts, selectionMode);
  const selectedIds = sel.selectedIds;

  // Stats (sempre baseados no contexto ativo)
  const stats = useMemo(() => {
    const source = isRemoteListView ? productsWithVariant : legacyFavoriteProducts;
    if (source.length === 0) return null;
    const prices = source.map((p) => p.price ?? 0).filter((v) => v > 0);
    return {
      total: source.length,
      categories: new Set(source.map((p) => p.category?.id ?? p.category_id)).size,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
    };
  }, [productsWithVariant, legacyFavoriteProducts, isRemoteListView]);

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Total counter para header principal (lista remota tem prioridade)
  const activeList = useMemo(() => lists.find((l) => l.id === selectedListId) ?? null, [lists, selectedListId]);
  const headerTotalCount = isRemoteListView ? rawItems.length : favoriteCount;

  const handleClearAll = () => {
    if (isRemoteListView) {
      toast.info("Use a lixeira para remover items individualmente");
      return;
    }
    clearFavorites();
    toast.success("Todos os favoritos foram removidos");
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) sel.clearSelection();
      return !prev;
    });
  };

  const handleRemoveSelected = () => {
    const ids = Array.from(selectedIds);
    if (isRemoteListView) {
      ids.forEach((pid) => {
        const meta = noteMap.get(pid);
        if (meta) removeItem.mutate(meta.itemId);
      });
    } else {
      ids.forEach((id) => toggleFavorite(id));
    }
    toast.success(`${ids.length} ${ids.length === 1 ? "item removido" : "itens removidos"}`);
    sel.clearSelection();
    setSelectionMode(false);
  };

  const handleRemoveFavorite = (productId: string, productName: string) => {
    if (isRemoteListView) {
      const meta = noteMap.get(productId);
      if (meta) removeItem.mutate(meta.itemId);
    } else {
      toggleFavorite(productId);
      toast.success(`"${productName}" removido dos favoritos`);
    }
    setAriaAnnouncement(`${productName} removido dos favoritos`);
  };

  const handleToggleFavorite = (productId: string) => {
    const product = (isRemoteListView ? productsWithVariant : legacyFavoriteProducts).find((p) => p.id === productId);
    if (isRemoteListView) {
      const meta = noteMap.get(productId);
      if (meta) removeItem.mutate(meta.itemId);
    } else {
      toggleFavorite(productId);
      if (product) toast.success(`"${product.name}" removido dos favoritos`);
    }
    if (product) setAriaAnnouncement(`${product.name} removido dos favoritos`);
  };

  const handleSaveNote = async (productId: string, note: string | null) => {
    const meta = noteMap.get(productId);
    if (!meta) return;
    await updateItem.mutateAsync({ id: meta.itemId, note });
    toast.success("Nota salva");
  };

  // Sidebar reutilizável (desktop + sheet mobile)
  const sidebarNode = (
    <FavoriteListsSidebar
      lists={lists}
      selectedListId={selectedListId}
      onSelectList={(id) => { setSelectedListId(id); setShowTrash(false); setSidebarOpen(false); }}
      onCreateList={async (data) => { await createList.mutateAsync(data); }}
      onUpdateList={async (id, patch) => { await updateList.mutateAsync({ id, ...patch }); }}
      onDeleteList={async (id) => {
        await deleteList.mutateAsync(id);
        if (selectedListId === id) setSelectedListId(null);
      }}
      onShareList={async (id, days) => generateShareToken.mutateAsync({ listId: id, expiresInDays: days })}
      onRevokeShare={async (id) => { await revokeShareToken.mutateAsync(id); }}
      trashCount={trashItems.length}
      showTrash={showTrash}
      onToggleTrash={(s) => { setShowTrash(s); if (s) setSidebarOpen(false); }}
    />
  );

  function HeaderCount() {
    return <p data-testid="favorites-count" className="text-muted-foreground text-sm">
      <span data-testid="favorites-count-items">{headerTotalCount}</span>{' '}
      {headerTotalCount === 1 ? 'item' : 'itens'}
      {lists.length > 0 && <>{' • '}<span data-testid="favorites-count-lists">{lists.length}</span>{' '}
        {lists.length === 1 ? 'lista' : 'listas'}</>}
    </p>;
  }

  function ClearAllAction() {
    if (isRemoteListView) return null;
    return <><Button variant="outline" size="sm" className="text-destructive hover:text-destructive"
      onClick={() => setClearAllDialogOpen(true)}><Trash2 className="h-4 w-4 mr-2" />Limpar Tudo</Button>
      <DeleteConfirmDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen} entityName="favoritos"
        itemName={`todos os ${favoriteCount} produtos`} onConfirm={handleClearAll} /></>;
  }

  function SelectionAction() {
    return <><Button variant={selectionMode ? 'default' : 'outline'} size="sm"
      className={cn('gap-1.5 h-8 transition-all relative', selectionMode
        ? 'bg-primary text-primary-foreground' : 'hover:border-primary/50')} onClick={toggleSelectionMode}>
      <CheckSquare className="h-3.5 w-3.5" />
      <span className="hidden sm:inline text-xs">{selectionMode ? 'Cancelar' : 'Selecionar'}</span>
      <AnimatePresence>{selectionMode && selectedIds.size > 0 && <motion.div initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }} className="absolute -top-2 -right-2">
        <Badge className="bg-destructive text-destructive-foreground h-5 min-w-5 text-[10px] font-bold px-1.5 py-0 flex items-center justify-center tabular-nums shadow-lg">
          {selectedIds.size}
        </Badge>
      </motion.div>}</AnimatePresence>
    </Button><div className="hidden sm:block"><LayoutPopover viewMode={viewMode} setViewMode={setViewMode}
      gridColumns={gridColumns} setGridColumns={setGridColumns} /></div></>;
  }

  function HeaderActions() {
    if (headerTotalCount === 0 || showTrash) return null;
    return <><ClearAllAction /><SelectionAction /></>;
  }

  function FavoritesHeader() {
    return <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div className="flex items-center gap-3"><div data-testid="favorites-icon" aria-label="Favoritos"
        className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
        <Heart className="h-6 w-6 text-destructive fill-destructive" /></div>
        <div><h1 data-testid="page-title-favoritos" className="text-2xl lg:text-3xl font-display font-bold text-foreground">
          Meus Produtos Favoritos</h1><HeaderCount /></div>
      </div>
      <div className="flex gap-2 items-center flex-wrap"><Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild><Button variant="outline" size="sm" className="lg:hidden">
          <FolderOpen className="h-4 w-4 mr-1.5" />Listas</Button></SheetTrigger>
        <SheetContent side="left" className="w-72 p-4 overflow-y-auto">{sidebarNode}</SheetContent>
      </Sheet><HeaderActions /></div>
    </div>;
  }

  function StatsCards() {
    if (!stats) return null;
    return <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="stat-card flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Package className="h-5 w-5 text-primary" /></div>
        <div><p className="text-2xl font-display font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Produtos</p></div></div>
      <div className="stat-card flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Layers className="h-5 w-5 text-primary" /></div>
        <div><p className="text-2xl font-display font-bold text-foreground">{stats.categories}</p><p className="text-xs text-muted-foreground">Categorias</p></div></div>
      <div className="stat-card flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0"><TrendingDown className="h-5 w-5 text-success" /></div>
        <div><p className="text-2xl font-display font-bold text-foreground">{fmt(stats.minPrice)}</p><p className="text-xs text-muted-foreground">Menor preço</p></div></div>
      <div className="stat-card flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><TrendingUp className="h-5 w-5 text-primary" /></div>
        <div><p className="text-2xl font-display font-bold text-foreground">{fmt(stats.maxPrice)}</p><p className="text-xs text-muted-foreground">Maior preço</p></div></div>
    </div>;
  }

  function FavoritesSearch() {
    if (productsWithVariant.length === 0) return null;
    return <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Buscar nos favoritos..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
    </div>;
  }

  function SelectionBar() {
    if (!selectionMode || productsWithVariant.length === 0) return null;
    return <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 animate-fade-in">
      <div className="flex items-center gap-2 text-sm"><CheckSquare className="h-4 w-4 text-primary" />
        <span className="font-medium text-foreground">{selectedIds.size} {selectedIds.size === 1 ? 'selecionado' : 'selecionados'}</span>
        <span className="text-muted-foreground">de {filteredProducts.length}</span></div>
      <div className="flex gap-2 items-center"><Button variant="ghost" size="sm" onClick={sel.selectAll}
        disabled={selectedIds.size === filteredProducts.length}>Selecionar tudo</Button>
        <Button variant="ghost" size="sm" onClick={sel.clearSelection} disabled={selectedIds.size === 0}><X className="h-3.5 w-3.5 mr-1" />Limpar</Button>
        <Button variant="destructive" size="sm" disabled={selectedIds.size === 0} onClick={() => setRemoveSelectedDialogOpen(true)}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />Remover ({selectedIds.size})</Button>
        <DeleteConfirmDialog open={removeSelectedDialogOpen} onOpenChange={setRemoveSelectedDialogOpen}
          entityName="itens selecionados" itemName={`${selectedIds.size} ${selectedIds.size === 1 ? 'item' : 'itens'}`}
          onConfirm={handleRemoveSelected} />
      </div>
    </div>;
  }

  function SelectedIndicator({ selected, position }: { selected: boolean; position: 'list' | 'grid' }) {
    if (!selectionMode) return null;
    return <div className={position === 'list' ? 'absolute top-2 left-2 z-20' : 'absolute top-3 left-3 z-20'}>
      <div className={cn('h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all backdrop-blur-sm',
        selected ? 'bg-primary border-primary' : 'bg-card/90 border-border')}>
        {selected && <CheckSquare className="h-3.5 w-3.5 text-primary-foreground" />}
      </div>
    </div>;
  }

  function FavoriteListRow({ product }: { product: Product }) {
    const selected = selectedIds.has(product.id);
    return <div className={cn('relative rounded-lg transition-all', selectionMode && 'cursor-pointer',
      selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}
      onClick={selectionMode ? () => sel.toggleSelect(product.id) : undefined}>
      <div className={cn(selectionMode && 'pointer-events-none')}><ProductListItem product={product}
        onClick={() => navigate(`/produto/${product.id}`)} isFavorited={isFavorite(product.id)} onToggleFavorite={handleToggleFavorite} /></div>
      <SelectedIndicator selected={selected} position="list" />
    </div>;
  }

  function PriceDropIndicator({ product, meta }: { product: Product; meta: FavoritePriceMeta | undefined }) {
    if (!isRemoteListView || !meta || selectionMode) return null;
    return <div className="absolute bottom-3 left-3 z-10 pointer-events-auto"><PriceDropBadge priceDiffPct={meta.priceDiffPct}
      priceAtSave={meta.priceAtSave} currentPrice={product.price} savedAt={meta.savedAt} /></div>;
  }

  function VariantBadge({ variant }: { variant: FavoriteVariantInfo | undefined }) {
    if (!variant?.color_name) return null;
    return <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm text-[10px] gap-1 px-1.5 py-0.5">
      {variant.color_hex && <span className="inline-block w-2.5 h-2.5 rounded-full border border-border/50 shrink-0"
        style={{ backgroundColor: variant.color_hex }} />}<span className="truncate max-w-[80px]">{variant.color_name}</span>
    </Badge>;
  }

  function FavoriteCardActions({ product, note, variant }: {
    product: Product; note: FavoriteNoteMeta | undefined; variant: FavoriteVariantInfo | undefined;
  }) {
    if (selectionMode) return null;
    return <div className="absolute top-3 right-3 z-40 flex flex-col items-end gap-1.5">
      <Button variant="secondary" size="icon" aria-label="Remover favorito" data-testid="favorite-remove"
        className="h-8 w-8 bg-card/90 backdrop-blur-sm hover:bg-destructive/20"
        onClick={(event) => { event.stopPropagation(); handleRemoveFavorite(product.id, product.name); }}>
        <Heart className="h-4 w-4 fill-destructive text-destructive" /></Button>
      {isRemoteListView && note && <ItemNoteEditor initialNote={note.note} onSave={(value) => handleSaveNote(product.id, value)} />}
      <VariantBadge variant={variant} />
    </div>;
  }

  function FavoriteGridItem({ product, index }: { product: Product; index: number }) {
    const selected = selectedIds.has(product.id);
    return <div data-testid="favorite-item" data-product-id={product.id} data-product-name={product.name}
      className={cn('animate-fade-in relative rounded-xl transition-all', selectionMode && 'cursor-pointer',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}
      style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
      onClick={selectionMode ? () => sel.toggleSelect(product.id) : undefined}>
      <div className={cn(selectionMode && 'pointer-events-none')}><ProductCard product={product}
        onClick={() => navigate(`/produto/${product.id}`)} onFavorite={() => handleRemoveFavorite(product.id, product.name)} /></div>
      <PriceDropIndicator product={product} meta={enrichedMetaMap.get(product.id)} />
      <SelectedIndicator selected={selected} position="grid" />
      <FavoriteCardActions product={product} note={noteMap.get(product.id)} variant={variantMap.get(product.id)} />
    </div>;
  }

  function EmptyFavoriteResults() {
    if (productsWithVariant.length > 0 && searchQuery) return <div className="text-center py-12 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10">
      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><h3 className="font-display text-lg font-semibold text-foreground mb-1">
        Nenhum favorito encontrado</h3><p className="text-muted-foreground text-sm">Nenhum produto corresponde a "{searchQuery}"</p>
    </div>;
    return <FavoritesEmptyStateSmart onAddProduct={(productId) => {
      if (isRemoteListView && activeList) toast.info('Abra o produto e use o coração para adicionar a esta lista');
      navigate(`/produto/${productId}`);
    }} />;
  }

  function FavoriteProducts() {
    if (filteredProducts.length === 0 && unavailableFavoriteIds.length === 0) return <EmptyFavoriteResults />;
    const unavailableCards = unavailableFavoriteIds.map((productId) => (
      <UnavailableFavoriteCard
        key={`unavailable-${productId}`}
        productId={productId}
        onRetry={() => getProductsByIds([productId])}
        onRemove={() => handleRemoveFavorite(productId, 'Produto indisponível')}
      />
    ));
    if (viewMode === 'table') return <>
      {filteredProducts.length > 0 && <ProductTableView products={filteredProducts}
        onProductClick={(productId) => navigate(`/produto/${productId}`)} isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite} selectionMode={selectionMode} selectedIds={selectedIds} onToggleSelect={sel.toggleSelect} />}
      {unavailableCards.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{unavailableCards}</div>}
    </>;
    if (viewMode === 'list') return <div className="space-y-1.5">
      {filteredProducts.map((product) => <FavoriteListRow key={product.id} product={product} />)}
      {unavailableCards}
    </div>;
    return <div data-testid="favorites-list" className={`grid ${getGridColsClass(gridColumns)} ${getGridGapClass(gridColumns)}`}>
      {filteredProducts.map((product, index) => <FavoriteGridItem key={product.id} product={product} index={index} />)}
      {unavailableCards}
    </div>;
  }

  function ActiveFavorites() {
    return <><FavoritesViewHeader list={activeList} itemCount={isRemoteListView ? rawItems.length : favoriteCount}
      sort={sort} onSortChange={setSort} fallbackTitle={!isRemoteListView ? 'Todos os favoritos' : undefined}
      fallbackSubtitle={!isRemoteListView && lists.length === 0 ? 'Crie uma lista para organizar' : undefined}
      onlyPriceDrops={isRemoteListView ? onlyPriceDrops : undefined}
      onTogglePriceDrops={isRemoteListView ? setOnlyPriceDrops : undefined} priceDropCount={priceDropCount}
      products={productsWithVariant} rawItems={isRemoteListView ? rawItems : undefined}
      onPresent={productsWithVariant.length > 0 ? () => setPresenting(true) : undefined} />
      <StatsCards /><FavoritesSearch /><SelectionBar /><FavoriteProducts /></>;
  }

  function MainView() {
    if (showTrash) return <><div className="flex items-center gap-2 px-1"><Trash2 className="h-5 w-5 text-muted-foreground" />
      <h2 className="text-lg font-display font-semibold text-foreground">Lixeira</h2></div><FavoritesTrashView /></>;
    return <ActiveFavorites />;
  }

  function Presentation() {
    if (!presenting) return null;
    return <FavoritePresentationLauncher products={productsWithVariant} listName={activeList?.name ?? 'Favoritos'}
      onClose={() => setPresenting(false)} />;
  }

  return <FavoritesPageBody />;

  function FavoritesPageBody() {
    return (
      <>
        <PageSEO title="Favoritos" description="Suas listas de produtos favoritos com organização, anotações e compartilhamento." path="/favoritos" />
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 pb-24 md:pb-6 animate-fade-in">
          <FavoritesHeader />
          <div className="flex gap-4 lg:gap-6">
            <div className="hidden lg:block">{sidebarNode}</div>
            <div className="flex-1 min-w-0 space-y-4"><MainView /></div>
          </div>
        </div>
        <CatalogBulkModals sel={sel} selectionMode={selectionMode} totalCount={filteredProducts.length} />
        <div role="status" aria-live="polite" className="sr-only">{ariaAnnouncement}</div>
        <Presentation />
      </>
    );
  }
}
