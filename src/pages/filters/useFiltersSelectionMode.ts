import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BulkVariantSelection, BulkWizardMode } from '@/components/catalog/BulkVariantWizard';
import type { Product } from '@/hooks/useProducts';
import { useComparisonStore } from '@/stores/useComparisonStore';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { toast } from 'sonner';

interface UseFiltersSelectionModeParams {
  selectionMode: boolean;
  filteredProducts: Product[];
}

function useSelectedProductIds(selectionMode: boolean, filteredProducts: Product[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!selectionMode) setSelectedIds(new Set());
  }, [selectionMode]);
  useEffect(() => {
    setSelectedIds((previous) => {
      if (previous.size === 0) return previous;
      const validIds = new Set(filteredProducts.map((product) => product.id));
      const filtered = new Set([...previous].filter((id) => validIds.has(id)));
      return filtered.size === previous.size ? previous : filtered;
    });
  }, [filteredProducts]);
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const selectAll = useCallback(
    () => setSelectedIds(new Set(filteredProducts.map((product) => product.id))),
    [filteredProducts],
  );
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  return { selectedIds, toggleSelect, selectAll, clearSelection };
}

function useWizardDialogState() {
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [variantWizardOpen, setVariantWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<BulkWizardMode>('cart');
  const [wizardSelections, setWizardSelections] = useState<BulkVariantSelection[]>([]);
  const openWizard = useCallback((mode: BulkWizardMode) => {
    setWizardMode(mode);
    setVariantWizardOpen(true);
  }, []);
  const handleBulkFavorite = useCallback(() => openWizard('favorite'), [openWizard]);
  const handleBulkCompare = useCallback(() => openWizard('compare'), [openWizard]);
  const handleBulkCollection = useCallback(() => openWizard('collection'), [openWizard]);
  const handleBulkCart = useCallback(() => openWizard('cart'), [openWizard]);
  const handleBulkQuote = useCallback(() => openWizard('quote'), [openWizard]);
  return {
    collectionModalOpen,
    setCollectionModalOpen,
    cartModalOpen,
    setCartModalOpen,
    variantWizardOpen,
    setVariantWizardOpen,
    wizardMode,
    wizardSelections,
    setWizardSelections,
    handleBulkFavorite,
    handleBulkCompare,
    handleBulkCollection,
    handleBulkCart,
    handleBulkQuote,
  };
}

function selectedVariant(selection: BulkVariantSelection) {
  const variant = selection.variant;
  if (!variant) return undefined;
  return {
    color_name: variant.color_name,
    color_hex: variant.color_hex,
    size_code: variant.size_code,
    variant_id: variant.id,
    thumbnail: variant.selected_thumbnail,
  };
}

function pluralSuffix(count: number) {
  return count > 1 ? 's' : '';
}

function valueOr<T>(value: T | null | undefined, fallback: T) {
  return value ? value : fallback;
}

function favoriteSelections(selections: BulkVariantSelection[]) {
  const { addFavorite, isFavorite } = useFavoritesStore.getState();
  let added = 0;
  for (const selection of selections) {
    if (isFavorite(selection.product.id)) continue;
    addFavorite(selection.product.id, selectedVariant(selection));
    added += 1;
  }
  const suffix = pluralSuffix(added);
  toast.success(`${added} produto${suffix} favoritado${suffix} com cor selecionada`);
}

function compareSelections(selections: BulkVariantSelection[]) {
  const { addToCompare, isInCompare } = useComparisonStore.getState();
  let added = 0;
  for (const selection of selections.slice(0, 4)) {
    if (isInCompare(selection.product.id)) continue;
    addToCompare(selection.product.id, selectedVariant(selection));
    added += 1;
  }
  const suffix = pluralSuffix(added);
  toast.success(`${added} produto${suffix} adicionado${suffix} à comparação`);
}

function quoteItem(selection: BulkVariantSelection) {
  const { product, variant } = selection;
  return {
    product_id: product.id,
    product_name: product.name,
    product_sku: valueOr(product.sku, ''),
    product_price: product.price,
    product_image: valueOr(variant?.selected_thumbnail, valueOr(product.images?.[0], '')),
    quantity: 1,
    color_name: valueOr(variant?.color_name, null),
    color_hex: valueOr(variant?.color_hex, null),
    size_code: valueOr(variant?.size_code, null),
  };
}

function sendSelectionsToQuote(
  selections: BulkVariantSelection[],
  navigate: (path: string) => void,
) {
  if (selections.length === 0) return false;
  const params = selections
    .map((selection) => `items[]=${encodeURIComponent(JSON.stringify(quoteItem(selection)))}`)
    .join('&');
  navigate(`/orcamentos/novo?${params}`);
  const suffix = pluralSuffix(selections.length);
  toast.success(`${selections.length} produto${suffix} enviado${suffix} para orçamento`);
  return true;
}

interface WizardCompletionParams {
  wizardMode: BulkWizardMode;
  navigate: (path: string) => void;
  clearSelection: () => void;
  setWizardSelections: (selections: BulkVariantSelection[]) => void;
  setCartModalOpen: (open: boolean) => void;
  setCollectionModalOpen: (open: boolean) => void;
}

function useWizardCompletion(params: WizardCompletionParams) {
  return useCallback(
    (selections: BulkVariantSelection[]) => {
      if (params.wizardMode === 'cart') {
        params.setWizardSelections(selections);
        params.setCartModalOpen(true);
        return;
      }
      if (params.wizardMode === 'collection') {
        params.setWizardSelections(selections);
        params.setCollectionModalOpen(true);
        return;
      }
      if (params.wizardMode === 'quote') {
        if (sendSelectionsToQuote(selections, params.navigate)) params.clearSelection();
        return;
      }
      if (params.wizardMode === 'favorite') favoriteSelections(selections);
      if (params.wizardMode === 'compare') compareSelections(selections);
      params.clearSelection();
    },
    [params],
  );
}

export function useFiltersSelectionMode({
  selectionMode,
  filteredProducts,
}: UseFiltersSelectionModeParams) {
  const navigate = useNavigate();
  const selection = useSelectedProductIds(selectionMode, filteredProducts);
  const wizard = useWizardDialogState();
  const handleWizardComplete = useWizardCompletion({
    wizardMode: wizard.wizardMode,
    navigate,
    clearSelection: selection.clearSelection,
    setWizardSelections: wizard.setWizardSelections,
    setCartModalOpen: wizard.setCartModalOpen,
    setCollectionModalOpen: wizard.setCollectionModalOpen,
  });
  const bulkCartProducts = useMemo(() => {
    const ids = new Set(selection.selectedIds);
    return filteredProducts.filter((product) => ids.has(product.id));
  }, [selection.selectedIds, filteredProducts]);
  const firstSelectedId = selection.selectedIds.values().next().value ?? '';
  const firstSelectedProduct = filteredProducts.find((product) => product.id === firstSelectedId);
  return {
    ...selection,
    selectedCount: selection.selectedIds.size,
    ...wizard,
    handleWizardComplete,
    bulkCartProducts,
    firstSelectedId,
    firstSelectedProduct,
  };
}
