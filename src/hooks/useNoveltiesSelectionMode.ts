/**
 * useNoveltiesSelectionMode — Hook de seleção em lote para o módulo Novidades.
 * Replicação do padrão useFiltersSelectionMode adaptado para NoveltyWithDetails.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { NoveltyWithDetails } from "@/hooks/useNovelties";
import type { Product } from "@/hooks/useProducts";
import type { BulkVariantSelection, BulkWizardMode } from "@/components/catalog/BulkVariantWizard";
import { completeBulkSelection } from "@/hooks/selection/bulkSelectionActions";

interface UseNoveltiesSelectionModeParams {
  selectionMode: boolean;
  filteredProducts: NoveltyWithDetails[];
}

/**
 * Converte NoveltyWithDetails para Product (mínimo necessário para o BulkVariantWizard)
 */
function noveltyToProduct(n: NoveltyWithDetails): Product {
  return {
    id: n.product_id,
    name: n.product_name,
    description: n.product_description,
    category_id: n.category_id,
    category_name: n.category_name,
    price: n.base_price || 0,
    image_url: n.product_image || undefined,
    images: n.product_image ? [n.product_image] : [],
    sku: n.product_sku || '',
    stock: 0,
    created_at: n.detected_at,
    colors: [],
    materials: [],
    supplier_reference: n.supplier_product_code,
    brand: null,
    is_active: n.is_active,
    minQuantity: 1,
    stockStatus: 'in-stock',
    featured: n.is_highlighted,
    newArrival: true,
    onSale: false,
    isKit: false,
    gender: null,
    category: { id: n.category_id || '', name: n.category_name || '' },
    supplier: { id: n.supplier_id || '', name: n.supplier_name || '' },
    tags: {
      publicoAlvo: [],
      datasComemorativas: [],
      endomarketing: [],
      ramo: [],
      nicho: [],
    },
  };
}

export function useNoveltiesSelectionMode({ selectionMode, filteredProducts }: UseNoveltiesSelectionModeParams) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [variantWizardOpen, setVariantWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<BulkWizardMode>('cart');
  const [wizardSelections, setWizardSelections] = useState<BulkVariantSelection[]>([]);

  const selectedCount = selectedIds.size;

  // Clear selection when leaving selection mode
  useEffect(() => { if (!selectionMode) setSelectedIds(new Set()); }, [selectionMode]);

  // Remove stale IDs when products change
  useEffect(() => {
    setSelectedIds(prev => {
      if (prev.size === 0) return prev;
      const validIds = new Set(filteredProducts.map(p => p.product_id));
      const filtered = new Set([...prev].filter(id => validIds.has(id)));
      return filtered.size === prev.size ? prev : filtered;
    });
  }, [filteredProducts]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelectedIds(new Set(filteredProducts.map(p => p.product_id))), [filteredProducts]);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkFavorite = useCallback(() => { setWizardMode('favorite'); setVariantWizardOpen(true); }, []);
  const handleBulkCompare = useCallback(() => { setWizardMode('compare'); setVariantWizardOpen(true); }, []);
  const handleBulkCollection = useCallback(() => { setWizardMode('collection'); setVariantWizardOpen(true); }, []);
  const handleBulkCart = useCallback(() => { setWizardMode('cart'); setVariantWizardOpen(true); }, []);
  const handleBulkQuote = useCallback(() => { setWizardMode('quote'); setVariantWizardOpen(true); }, []);

  const handleWizardComplete = useCallback((selections: BulkVariantSelection[]) => {
    completeBulkSelection({ mode: wizardMode, selections, navigate, clearSelection, setWizardSelections,
      openCart: () => setCartModalOpen(true), openCollection: () => setCollectionModalOpen(true) });
  }, [wizardMode, navigate, clearSelection]);

  const bulkCartProducts = useMemo(() => {
    const ids = Array.from(selectedIds);
    return filteredProducts.filter(p => ids.includes(p.product_id)).map(noveltyToProduct);
  }, [selectedIds, filteredProducts]);

  const selectedProducts = useMemo(() => {
    const ids = Array.from(selectedIds);
    return filteredProducts.filter(p => ids.includes(p.product_id)).map(noveltyToProduct);
  }, [selectedIds, filteredProducts]);

  const firstSelectedId = selectedIds.size > 0 ? Array.from(selectedIds)[0] ?? "" : "";
  const firstSelectedProduct = filteredProducts.find(p => p.product_id === firstSelectedId);

  return {
    selectedIds, selectedCount, toggleSelect, selectAll, clearSelection,
    collectionModalOpen, setCollectionModalOpen,
    cartModalOpen, setCartModalOpen,
    variantWizardOpen, setVariantWizardOpen,
    wizardMode, wizardSelections,
    handleBulkFavorite, handleBulkCompare, handleBulkCollection, handleBulkCart, handleBulkQuote,
    handleWizardComplete, bulkCartProducts, selectedProducts,
    firstSelectedId, firstSelectedProduct,
    noveltyToProduct,
  };
}
