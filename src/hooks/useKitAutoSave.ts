/**
 * Kit Auto-Save Hook
 * Saves kit state automatically with debounce (5 seconds).
 * Only triggers after the user has made meaningful changes.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { KitState } from '@/lib/kit-builder';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const AUTO_SAVE_DELAY_MS = 5000;

interface AutoSaveResult {
  lastSavedAt: Date | null;
  isSaving: boolean;
  autoSavedKitId: string | null;
  lastSaveError: string | null;
  retry: () => void;
}

function createSnapshot(kitState: KitState, kitQuantity: number): string {
  return JSON.stringify({
    box: kitState.box,
    items: kitState.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      selectedVariantId: item.selectedVariantId,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
      sku: item.sku,
      price: item.price,
      imageUrl: item.imageUrl,
    })),
    personalization: kitState.personalization,
    name: kitState.name,
    kitType: kitState.kitType,
    qty: kitQuantity,
  });
}

export function useKitAutoSave(
  kitState: KitState,
  kitQuantity: number,
  currentKitId: string | undefined,
  onKitIdCreated?: (id: string) => void,
): AutoSaveResult {
  const { user } = useAuth();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSavedKitId, setAutoSavedKitId] = useState<string | null>(currentKitId || null);
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const persistedSnapshotRef = useRef<string>('');
  const latestSnapshotRef = useRef<string>('');
  const kitIdRef = useRef<string | null>(currentKitId || null);
  const isFirstRender = useRef(true);

  const saveToDb = useCallback(async (snapshot: string) => {
    if (!user?.id) return;

    // Don't auto-save empty kits
    if (!kitState.box && kitState.items.length === 0) return;

    const payload = {
      user_id: user.id,
      name: kitState.name || 'Kit sem nome',
      status: 'draft' as const,
      kit_type: kitState.kitType || 'montado',
      box_data: kitState.box ? JSON.parse(JSON.stringify(kitState.box)) : null,
      items_data: JSON.parse(JSON.stringify(kitState.items)),
      personalization_data: JSON.parse(JSON.stringify(kitState.personalization)),
      kit_quantity: kitQuantity,
      box_price: kitState.boxPrice,
      items_price: kitState.itemsPrice,
      personalization_price: kitState.personalizationPrice,
      total_price: kitState.totalPrice,
      volume_usage_percent: kitState.volumeUsagePercent,
      updated_at: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      const kitId = kitIdRef.current;
      if (kitId) {
        const { error } = await supabase
          .from('custom_kits')
          .update(payload)
          .eq('id', kitId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('custom_kits')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        if (!data?.id) throw new Error('O kit não retornou um identificador após o salvamento.');
        kitIdRef.current = data.id;
        setAutoSavedKitId(data.id);
        onKitIdCreated?.(data.id);
      }
      persistedSnapshotRef.current = snapshot;
      setLastSavedAt(new Date());
      setLastSaveError(null);
    } catch (err) {
      logger.warn('[auto-save] Failed:', err);
      const message = err instanceof Error ? err.message : 'Não foi possível salvar o kit automaticamente.';
      setLastSaveError(message);
      toast.error('O salvamento automático falhou. Seus dados continuam nesta página.', {
        description: 'Tente salvar novamente antes de sair.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, kitState, kitQuantity, onKitIdCreated]);

  // Create a snapshot hash to detect meaningful changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const initialSnapshot = createSnapshot(kitState, kitQuantity);
      persistedSnapshotRef.current = initialSnapshot;
      latestSnapshotRef.current = initialSnapshot;
      return;
    }

    const newSnapshot = createSnapshot(kitState, kitQuantity);
    latestSnapshotRef.current = newSnapshot;

    if (newSnapshot === persistedSnapshotRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void saveToDb(newSnapshot), AUTO_SAVE_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [kitState, kitQuantity, saveToDb]);

  // Update autoSavedKitId when currentKitId changes externally
  useEffect(() => {
    if (currentKitId) {
      kitIdRef.current = currentKitId;
      setAutoSavedKitId(currentKitId);
    }
  }, [currentKitId]);

  const retry = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const snapshot = latestSnapshotRef.current;
    if (snapshot && snapshot !== persistedSnapshotRef.current) void saveToDb(snapshot);
  }, [saveToDb]);

  return { lastSavedAt, isSaving, autoSavedKitId, lastSaveError, retry };
}
