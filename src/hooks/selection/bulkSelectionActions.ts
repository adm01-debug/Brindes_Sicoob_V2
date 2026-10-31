import type { BulkVariantSelection, BulkWizardMode } from '@/components/catalog/BulkVariantWizard';
import { useComparisonStore } from '@/stores/useComparisonStore';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { toast } from 'sonner';

type SetSelections = (selections: BulkVariantSelection[]) => void;

interface CompleteBulkActionInput {
  mode: BulkWizardMode;
  selections: BulkVariantSelection[];
  navigate: (url: string) => void;
  clearSelection: () => void;
  setWizardSelections: SetSelections;
  openCart: () => void;
  openCollection: () => void;
}

function variantPayload(selection: BulkVariantSelection) {
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

function quoteVariantFields(selection: BulkVariantSelection) {
  const variant = selection.variant;
  return {
    color_name: variant?.color_name || null,
    color_hex: variant?.color_hex || null,
    size_code: variant?.size_code || null,
  };
}

function quoteProductImage(selection: BulkVariantSelection): string {
  return selection.variant?.selected_thumbnail || selection.product.images?.[0] || '';
}

function quoteItemParam(selection: BulkVariantSelection): string {
  return `items[]=${encodeURIComponent(JSON.stringify({
    product_id: selection.product.id,
    product_name: selection.product.name,
    product_sku: selection.product.sku || '',
    product_price: selection.product.price,
    product_image: quoteProductImage(selection),
    quantity: 1,
    ...quoteVariantFields(selection),
  }))}`;
}

function pluralized(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function addFavorites(selections: BulkVariantSelection[]): number {
  const { addFavorite, isFavorite } = useFavoritesStore.getState();
  let added = 0;
  for (const selection of selections) {
    if (isFavorite(selection.product.id)) continue;
    addFavorite(selection.product.id, variantPayload(selection));
    added += 1;
  }
  return added;
}

function addComparisons(selections: BulkVariantSelection[]): number {
  const { addToCompare, isInCompare } = useComparisonStore.getState();
  let added = 0;
  for (const selection of selections.slice(0, 4)) {
    if (isInCompare(selection.product.id)) continue;
    addToCompare(selection.product.id, variantPayload(selection));
    added += 1;
  }
  return added;
}

function sendQuote(input: CompleteBulkActionInput): void {
  if (input.selections.length === 0) return;
  input.navigate(`/orcamentos/novo?${input.selections.map(quoteItemParam).join('&')}`);
  const count = input.selections.length;
  toast.success(`${count} ${pluralized(count, 'produto enviado', 'produtos enviados')} para orçamento`);
  input.clearSelection();
}

export function completeBulkSelection(input: CompleteBulkActionInput): void {
  if (input.mode === 'cart' || input.mode === 'collection') {
    input.setWizardSelections(input.selections);
    if (input.mode === 'cart') input.openCart();
    else input.openCollection();
    return;
  }
  if (input.mode === 'quote') return sendQuote(input);
  const added = input.mode === 'favorite' ? addFavorites(input.selections) : addComparisons(input.selections);
  const message = input.mode === 'favorite'
    ? pluralized(added, 'produto favoritado', 'produtos favoritados')
    : pluralized(added, 'produto adicionado à comparação', 'produtos adicionados à comparação');
  toast.success(`${added} ${message}`);
  input.clearSelection();
}
