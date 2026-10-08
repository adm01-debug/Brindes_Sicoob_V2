import { type ComponentProps, useEffect, useState, useCallback } from "react";
import { ProductListItem } from "./ProductListItem";
import { BulkActionBar } from "./BulkActionBar";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import type { Product } from "@/hooks/useProducts";
import type { ActiveColorFilter } from "@/utils/color-image-resolver";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProductListProps {
  products: Product[];
  onProductClick?: (productId: string) => void;
  onViewProduct?: (product: Product) => void;
  onShareProduct?: (product: Product) => void;
  onFavoriteProduct?: (product: Product) => void;
  isFavorite?: (productId: string) => boolean;
  onToggleFavorite?: (productId: string) => void;
  isInCompare?: (productId: string) => boolean;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  canAddToCompare?: boolean;
  highlightColors?: string[];
  activeColorFilter?: ActiveColorFilter | null;
  /** External selection mode — when provided, internal state is bypassed */
  selectionMode?: boolean;
  /** External selected IDs — controlled externally */
  externalSelectedIds?: Set<string>;
  /** External toggle handler */
  onToggleSelect?: (id: string) => void;
}

function toggleSetValue(values: Set<string>, id: string) {
  const next = new Set(values);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function useProductSelection({
  products,
  externalSelectedIds,
  externalToggleSelect,
  externalSelectionMode,
}: Pick<ProductListProps, "products" | "externalSelectedIds"> & {
  externalSelectionMode?: boolean;
  externalToggleSelect: ProductListProps["onToggleSelect"];
}) {
  const isExternallyControlled = externalSelectedIds !== undefined && externalToggleSelect !== undefined;
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isExternallyControlled) setInternalSelectedIds(new Set());
  }, [products.length, isExternallyControlled]);

  const selectedIds = isExternallyControlled ? externalSelectedIds : internalSelectedIds;
  const selectionMode = isExternallyControlled ? (externalSelectionMode ?? false) : internalSelectedIds.size > 0;
  const toggleSelect = useCallback((id: string) => {
    if (externalToggleSelect && isExternallyControlled) externalToggleSelect(id);
    else setInternalSelectedIds((previous) => toggleSetValue(previous, id));
  }, [externalToggleSelect, isExternallyControlled]);
  const selectAll = useCallback(() => {
    if (!isExternallyControlled) setInternalSelectedIds(new Set(products.map((product) => product.id)));
  }, [products, isExternallyControlled]);
  const clearSelection = useCallback(() => {
    if (!isExternallyControlled) setInternalSelectedIds(new Set());
  }, [isExternallyControlled]);

  return { clearSelection, isExternallyControlled, selectedIds, selectAll, selectionMode, toggleSelect };
}

function ProductListItemWrapper({
  product,
  index,
  isSelected,
  selectionMode,
  onToggleSelect,
  ...props
}: {
  product: Product;
  index: number;
  isSelected: boolean;
  selectionMode: boolean;
  onToggleSelect: (id: string) => void;
} & Omit<ComponentProps<typeof ProductListItem>, 'product'>) {
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), Math.min(index * 40, 400));
    return () => clearTimeout(timer);
  }, [index]);

    return (
      <div
        className={cn(
          "relative transition-all duration-300 ease-out group/row",
          hasAnimated ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3",
          isSelected && "ring-2 ring-primary/40 rounded-xl bg-primary/5"
        )}
      >
        <div className={cn(
          "flex items-center gap-2",
          selectionMode && "pl-1"
        )}>
          {selectionMode && (
            <div className="flex-shrink-0">
              <SelectionCheckbox
                checked={isSelected}
                onChange={() => onToggleSelect(product.id)}
                size="md"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <ProductListItem product={product} {...props} />
          </div>
        </div>
      </div>
    );
}

function EmptyProductList() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><span className="text-3xl">📦</span></div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">Nenhum produto encontrado</h3>
      <p className="text-muted-foreground max-w-md">Tente ajustar os filtros ou realizar uma nova busca para encontrar os produtos desejados.</p>
    </div>
  );
}

function useBulkProductActions({ selectedIds, clearSelection, isFavorite, onToggleFavorite, isInCompare, onToggleCompare }: Pick<ProductListProps, "isFavorite" | "onToggleFavorite" | "isInCompare" | "onToggleCompare"> & { selectedIds: Set<string>; clearSelection: () => void }) {
  const favorite = useCallback(() => {
    if (!onToggleFavorite) return;
    let added = 0;
    selectedIds.forEach((id) => { if (!isFavorite?.(id)) { onToggleFavorite(id); added += 1; } });
    toast.success(`${added} produto${added > 1 ? "s" : ""} adicionado${added > 1 ? "s" : ""} aos favoritos`);
    clearSelection();
  }, [selectedIds, onToggleFavorite, isFavorite, clearSelection]);
  const compare = useCallback(() => {
    if (!onToggleCompare) return;
    const ids = Array.from(selectedIds).slice(0, 4);
    ids.forEach((id) => { if (!isInCompare?.(id)) onToggleCompare(id); });
    toast.success(`${ids.length} produto${ids.length > 1 ? "s" : ""} adicionado${ids.length > 1 ? "s" : ""} à comparação`);
    clearSelection();
  }, [selectedIds, onToggleCompare, isInCompare, clearSelection]);
  return { compare, favorite };
}

function ProductRows({ props, selectedIds, selectionMode, toggleSelect }: { props: ProductListProps; selectedIds: Set<string>; selectionMode: boolean; toggleSelect: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {props.products.map((product, index) => (
        <ProductListItemWrapper key={product.id} product={product} index={index} isSelected={selectedIds.has(product.id)} selectionMode={selectionMode} onToggleSelect={toggleSelect}
          onClick={props.onProductClick ? () => props.onProductClick?.(product.id) : undefined} onView={props.onViewProduct} onShare={props.onShareProduct} onFavorite={props.onFavoriteProduct}
          isFavorited={props.isFavorite?.(product.id) ?? false} onToggleFavorite={props.onToggleFavorite} isInCompare={props.isInCompare?.(product.id) ?? false}
          onToggleCompare={props.onToggleCompare} canAddToCompare={props.canAddToCompare ?? true} highlightColors={props.highlightColors} activeColorFilter={props.activeColorFilter} />
      ))}
    </div>
  );
}

function InternalSelectionControls({ props, selectedIds, firstSelectedId, collectionModalOpen, setCollectionModalOpen, selectAll, clearSelection, bulk }: { props: ProductListProps; selectedIds: Set<string>; firstSelectedId: string; collectionModalOpen: boolean; setCollectionModalOpen: (open: boolean) => void; selectAll: () => void; clearSelection: () => void; bulk: ReturnType<typeof useBulkProductActions> }) {
  const firstSelectedProduct = props.products.find((product) => product.id === firstSelectedId);
  return (
    <>
      <BulkActionBar selectedCount={selectedIds.size} totalCount={props.products.length} onSelectAll={selectAll} onClearSelection={clearSelection} onBulkFavorite={bulk.favorite} onBulkCompare={bulk.compare} onBulkCollection={() => setCollectionModalOpen(true)} />
      {firstSelectedProduct && <AddToCollectionModal open={collectionModalOpen} onOpenChange={(open) => { setCollectionModalOpen(open); if (!open) clearSelection(); }} productId={firstSelectedId} productName={`${selectedIds.size} produtos selecionados`} />}
    </>
  );
}

export function ProductList({
  products,
  onProductClick,
  onViewProduct,
  onShareProduct,
  onFavoriteProduct,
  isFavorite,
  onToggleFavorite,
  isInCompare,
  onToggleCompare,
  canAddToCompare = true,
  highlightColors,
  activeColorFilter,
  selectionMode: externalSelectionMode,
  externalSelectedIds,
  onToggleSelect: externalToggleSelect,
}: ProductListProps) {
  const props = { products, onProductClick, onViewProduct, onShareProduct, onFavoriteProduct, isFavorite, onToggleFavorite, isInCompare, onToggleCompare, canAddToCompare, highlightColors, activeColorFilter, selectionMode: externalSelectionMode, externalSelectedIds, onToggleSelect: externalToggleSelect };
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const { clearSelection, isExternallyControlled, selectedIds, selectAll, selectionMode, toggleSelect } = useProductSelection({
    products,
    externalSelectedIds,
    externalToggleSelect,
    externalSelectionMode,
  });
  const bulk = useBulkProductActions({ selectedIds, clearSelection, isFavorite, onToggleFavorite, isInCompare, onToggleCompare });
  if (products.length === 0) return <EmptyProductList />;

  const firstSelectedId = selectedIds.size > 0 ? Array.from(selectedIds)[0] : "";
  return (
    <>
      <ProductRows props={props} selectedIds={selectedIds} selectionMode={selectionMode} toggleSelect={toggleSelect} />
      {!isExternallyControlled && <InternalSelectionControls props={props} selectedIds={selectedIds} firstSelectedId={firstSelectedId ?? ""} collectionModalOpen={collectionModalOpen} setCollectionModalOpen={setCollectionModalOpen} selectAll={selectAll} clearSelection={clearSelection} bulk={bulk} />}
    </>
  );
}
