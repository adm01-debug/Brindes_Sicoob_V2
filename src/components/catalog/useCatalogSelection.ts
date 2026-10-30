/**
 * useCatalogSelection — Shared selection + bulk-action logic for CatalogContent.
 * Extracted to eliminate 3x duplication of BulkActionBar wiring.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import type { Product } from "@/hooks/useProducts";
import type { BulkVariantSelection, BulkWizardMode } from "@/components/catalog/BulkVariantWizard";

function useSelectionSet(products: Product[], selectionMode?: boolean, onCountChange?: (count: number) => void) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  useEffect(() => { if (!selectionMode) setSelectedIds(new Set()); }, [selectionMode]);
  useEffect(() => {
    setSelectedIds(prev => {
      if (prev.size === 0) return prev;
      const validIds = new Set(products.map(product => product.id));
      const filtered = new Set([...prev].filter(id => validIds.has(id)));
      return filtered.size === prev.size ? prev : filtered;
    });
  }, [products]);
  useEffect(() => { onCountChange?.(selectedIds.size); }, [selectedIds.size, onCountChange]);
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const selectAll = useCallback(() => setSelectedIds(new Set(products.map(product => product.id))), [products]);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  return { selectedIds, toggleSelect, selectAll, clearSelection };
}

function useWizardState() {
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [variantWizardOpen, setVariantWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<BulkWizardMode>("cart");
  const [wizardSelections, setWizardSelections] = useState<BulkVariantSelection[]>([]);

  const openWizard = useCallback((mode: BulkWizardMode) => {
    setWizardMode(mode);
    setVariantWizardOpen(true);
  }, []);
  return { collectionModalOpen, setCollectionModalOpen, cartModalOpen, setCartModalOpen, variantWizardOpen, setVariantWizardOpen,
    wizardMode, wizardSelections, setWizardSelections, openWizard };
}

type WizardState = ReturnType<typeof useWizardState>;

function selectionVariant(selection: BulkVariantSelection) {
  if (!selection.variant) return undefined;
  return { color_name: selection.variant.color_name, color_hex: selection.variant.color_hex, size_code: selection.variant.size_code,
    variant_id: selection.variant.id, thumbnail: selection.variant.selected_thumbnail };
}

function quoteVariantFields(selection: BulkVariantSelection) {
  if (!selection.variant) return { product_image: selection.product.images?.[0] || '', color_name: null, color_hex: null, size_code: null };
  return { product_image: selection.variant.selected_thumbnail || selection.product.images?.[0] || '', color_name: selection.variant.color_name || null,
    color_hex: selection.variant.color_hex || null, size_code: selection.variant.size_code || null };
}

function quoteItem(selection: BulkVariantSelection) {
  return { product_id: selection.product.id, product_name: selection.product.name, product_sku: selection.product.sku || '',
    product_price: selection.product.price, quantity: 1, ...quoteVariantFields(selection) };
}

function quoteParams(selections: BulkVariantSelection[]) {
  return selections.map(selection => `items[]=${encodeURIComponent(JSON.stringify(quoteItem(selection)))}`).join("&");
}

function pluralMessage(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function useWizardComplete(wizard: WizardState, clearSelection: () => void) {
  const navigate = useNavigate();
  const favorites = useFavoritesStore();
  const comparison = useComparisonStore();
  return useCallback((selections: BulkVariantSelection[]) => {
    if (wizard.wizardMode === "cart") { wizard.setWizardSelections(selections); wizard.setCartModalOpen(true); return; }
    if (wizard.wizardMode === "collection") { wizard.setWizardSelections(selections); wizard.setCollectionModalOpen(true); return; }
    if (wizard.wizardMode === "quote") {
      if (selections.length === 0) return;
      navigate(`/orcamentos/novo?${quoteParams(selections)}`);
      toast.success(pluralMessage(selections.length, "1 produto enviado para orçamento", `${selections.length} produtos enviados para orçamento`));
      clearSelection();
      return;
    }
    const target = wizard.wizardMode === "compare" ? selections.slice(0, 4) : selections;
    const added = target.filter(selection => {
      if (wizard.wizardMode === "favorite" && !favorites.isFavorite(selection.product.id)) { favorites.addFavorite(selection.product.id, selectionVariant(selection)); return true; }
      if (wizard.wizardMode === "compare" && !comparison.isInCompare(selection.product.id)) { comparison.addToCompare(selection.product.id, selectionVariant(selection)); return true; }
      return false;
    }).length;
    const message = wizard.wizardMode === "favorite" ? pluralMessage(added, "1 produto favoritado com cor selecionada", `${added} produtos favoritados com cor selecionada`)
      : pluralMessage(added, "1 produto adicionado à comparação", `${added} produtos adicionados à comparação`);
    toast.success(message);
    clearSelection();
  }, [wizard, navigate, clearSelection, favorites, comparison]);
}

export function useCatalogSelection(paginatedProducts: Product[], selectionMode?: boolean, onSelectedCountChange?: (count: number) => void) {
  const selection = useSelectionSet(paginatedProducts, selectionMode, onSelectedCountChange);
  const wizard = useWizardState();
  const handleWizardComplete = useWizardComplete(wizard, selection.clearSelection);
  const bulkHandlers = useMemo(() => ({ handleBulkFavorite: () => wizard.openWizard("favorite"), handleBulkCompare: () => wizard.openWizard("compare"),
    handleBulkCollection: () => wizard.openWizard("collection"), handleBulkQuote: () => wizard.openWizard("quote"), handleBulkCart: () => wizard.openWizard("cart") }), [wizard]);

  const bulkCartProducts = useMemo(() => {
    const ids = Array.from(selection.selectedIds);
    return paginatedProducts.filter(product => ids.includes(product.id));
  }, [selection.selectedIds, paginatedProducts]);

  const firstSelectedId = selection.selectedIds.size > 0 ? Array.from(selection.selectedIds)[0] : "";
  const firstSelectedProduct = paginatedProducts.find(product => product.id === firstSelectedId);

  return {
    ...selection, ...wizard, ...bulkHandlers, bulkCartProducts,
    firstSelectedId, firstSelectedProduct,
    handleWizardComplete,
  };
}
