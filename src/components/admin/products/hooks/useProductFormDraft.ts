/**
 * useProductFormDraft — Auto-save / restore form drafts from localStorage
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { type FieldPath, type FieldPathValue, type UseFormSetValue } from 'react-hook-form';
import { toast } from 'sonner';
import type { ProductFormData } from '../ProductFormSchema';

interface ProductFormDraftOptions {
  productId?: string;
  setValue: UseFormSetValue<ProductFormData>;
  formValues: ProductFormData;
  images: string[];
  stepIndex: number;
  setImages: (images: string[]) => void;
  setStepIndex: (index: number) => void;
}

interface ProductDraft {
  formData: Partial<ProductFormData>;
  images: string[];
  stepIndex: number;
  savedAt: number;
}

function restoreFormValues(setValue: UseFormSetValue<ProductFormData>, values: Partial<ProductFormData>) {
  type ProductPath = FieldPath<ProductFormData>;
  for (const key of Object.keys(values) as ProductPath[]) {
    const value = values[key] as FieldPathValue<ProductFormData, typeof key> | undefined;
    if (value !== undefined) setValue(key, value);
  }
}

function useDraftRestore(options: ProductFormDraftOptions, draftKey: string, onRestored: () => void) {
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as ProductDraft;
      if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) { localStorage.removeItem(draftKey); return; }
      restoreFormValues(options.setValue, draft.formData);
      if (draft.images?.length) options.setImages(draft.images);
      if (typeof draft.stepIndex === 'number') options.setStepIndex(draft.stepIndex);
      onRestored();
    } catch { /* ignora rascunhos corrompidos */ }
  }, [draftKey, onRestored, options]);
}

function useDraftPersistence(formValues: ProductFormData, images: string[], stepIndex: number, draftKey: string) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!formValues.name && !formValues.sku) return;
      try { localStorage.setItem(draftKey, JSON.stringify({ formData: formValues, images, stepIndex, savedAt: Date.now() })); } catch { /* quota excedida */ }
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [formValues, images, stepIndex, draftKey]);
}

export function useProductFormDraft({
  productId, setValue, formValues, images, stepIndex, setImages, setStepIndex,
}: ProductFormDraftOptions) {
  const DRAFT_KEY = `product-draft-${productId || 'new'}`;
  const [hasDraft, setHasDraft] = useState(false);
  const markRestored = useCallback(() => setHasDraft(true), []);
  useDraftRestore({ productId, setValue, formValues, images, stepIndex, setImages, setStepIndex }, DRAFT_KEY, markRestored);

  // Show draft restored notification
  useEffect(() => {
    if (!hasDraft) return;
    toast.info('Rascunho restaurado', {
      description: 'Seus dados não salvos foram recuperados automaticamente.',
      action: {
        label: 'Descartar',
        onClick: () => {
          localStorage.removeItem(DRAFT_KEY);
          window.location.reload();
        },
      },
      duration: 8000,
    });
  }, [hasDraft, DRAFT_KEY]);

  useDraftPersistence(formValues, images, stepIndex, DRAFT_KEY);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, [DRAFT_KEY]);

  return { clearDraft };
}
