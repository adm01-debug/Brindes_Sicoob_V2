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
import { kitIdentityDetails, kitIdentityLabels } from '@/hooks/useCustomKitPersistence';

const AUTO_SAVE_DELAY_MS = 5000;

interface AutoSaveResult {
  lastSavedAt: Date | null;
  isSaving: boolean;
  autoSavedKitId: string | null;
  lastSaveError: string | null;
  /** true enquanto o snapshot atual difere do último persistido no banco. */
  isDirty: boolean;
  /** Marca um snapshot como persistido (ex.: após salvamento manual).
   *  Se o estado mudou desde então, isDirty permanece true. */
  markPersisted: (snapshot: string) => void;
  /** Adota o próximo snapshot calculado como persistido — para carga
   *  assíncrona (kit aberto por URL) que preenche o estado após o
   *  baseline inicial. */
  markNextSnapshotPersisted: () => void;
  retry: () => void;
}

export function createKitSnapshot(kitState: KitState, kitQuantity: number): string {
  return JSON.stringify({
    box: kitState.box,
    identity: kitState.identity,
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

function requirePersistedKitId(
  result: { data: { id: string } | null; error: unknown },
  emptyMessage: string,
): string {
  if (result.error) throw result.error;
  if (!result.data?.id) throw new Error(emptyMessage);
  return result.data.id;
}

function isCreatedKitAdoption(
  userId: string | undefined,
  currentKitId: string | undefined,
  persistedKitId: string | null,
  currentScope: string,
): boolean {
  if (!userId || !currentKitId) return false;
  return currentKitId === persistedKitId && currentScope === `${userId}:new`;
}

function buildAutoSavePayload(userId: string, kitState: KitState, kitQuantity: number) {
  return {
    user_id: userId,
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
    ...kitIdentityLabels(kitState.identity),
    ...kitIdentityDetails(kitState.identity),
    updated_at: new Date().toISOString(),
  };
}

function isEmptyKit(kitState: KitState) {
  return !kitState.box && kitState.items.length === 0;
}

async function persistAutoSave(
  payload: ReturnType<typeof buildAutoSavePayload>,
  kitId: string | null,
  userId: string,
) {
  if (kitId) {
    const result = await supabase
      .from('custom_kits')
      .update(payload)
      .eq('id', kitId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();
    requirePersistedKitId(result, 'O kit não foi encontrado ou você não tem permissão para atualizá-lo.');
    return null;
  }
  const result = await supabase.from('custom_kits').insert(payload).select('id').single();
  return requirePersistedKitId(result, 'O kit não retornou um identificador após o salvamento.');
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
  const [isDirty, setIsDirty] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const persistedSnapshotRef = useRef<string>('');
  // Quando marcado, o próximo snapshot calculado vira o baseline persistido
  // (carga assíncrona de kit via URL, que chega depois do primeiro render).
  const baselineNextRef = useRef(false);
  const latestSnapshotRef = useRef<string>('');
  // Estado que gerou o último snapshot — usado para regravar o conteúdo
  // correto quando um save manual ultrapassa um autosave em voo.
  const latestStateRef = useRef<{ kitState: KitState; kitQuantity: number }>({ kitState, kitQuantity });
  const kitIdRef = useRef<string | null>(currentKitId || null);
  const scopeRef = useRef(`${user?.id ?? 'anon'}:${currentKitId ?? 'new'}`);
  const scopeGenerationRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSavesRef = useRef(0);
  const isFirstRender = useRef(true);

  const adoptCreatedId = useCallback((createdId: string | null) => {
    if (!createdId) return;
    kitIdRef.current = createdId;
    setAutoSavedKitId(createdId);
    onKitIdCreated?.(createdId);
  }, [onKitIdCreated]);

  // `source` mantém o estado que gerou `snapshot` — closures antigas não
  // devem regravar o kitState da renderização em que foram criadas.
  const saveToDb = useCallback(async (
    snapshot: string,
    source: { kitState: KitState; kitQuantity: number },
  ) => {
    if (!user?.id) return;

    // Don't auto-save empty kits
    if (isEmptyKit(source.kitState)) return;

    const payload = buildAutoSavePayload(user.id, source.kitState, source.kitQuantity);

    const operationGeneration = scopeGenerationRef.current;
    const operationUserId = user.id;
    const settlePersisted = (written: string) => {
      if (written === latestSnapshotRef.current) {
        persistedSnapshotRef.current = written;
        setIsDirty(false);
        return;
      }
      // Save manual mais recente aconteceu durante a gravação: o estado
      // atual já foi persistido, mas o registro recebeu o snapshot antigo
      // — regrava o mais novo. Edição comum segue a fila do autosave.
      if (persistedSnapshotRef.current === latestSnapshotRef.current) {
        void saveToDb(latestSnapshotRef.current, latestStateRef.current);
      }
    };
    const previousSave = saveQueueRef.current;
    let releaseQueue: () => void = () => undefined;
    saveQueueRef.current = new Promise<void>((resolve) => { releaseQueue = resolve; });
    pendingSavesRef.current += 1;
    setIsSaving(true);
    try {
      await previousSave;
      if (operationGeneration !== scopeGenerationRef.current) return;
      const createdId = await persistAutoSave(payload, kitIdRef.current, operationUserId);
      adoptCreatedId(createdId);
      if (operationGeneration === scopeGenerationRef.current) {
        setLastSavedAt(new Date());
        setLastSaveError(null);
        settlePersisted(snapshot);
      }
    } catch (err) {
      if (operationGeneration !== scopeGenerationRef.current) return;
      logger.warn('[auto-save] Failed:', err);
      const message = err instanceof Error ? err.message : 'Não foi possível salvar o kit automaticamente.';
      setLastSaveError(message);
      toast.error('O salvamento automático falhou. Seus dados continuam nesta página.', {
        description: 'Tente salvar novamente antes de sair.',
      });
    } finally {
      releaseQueue();
      pendingSavesRef.current -= 1;
      if (operationGeneration === scopeGenerationRef.current) {
        setIsSaving(pendingSavesRef.current > 0);
      }
    }
  }, [adoptCreatedId, user?.id]);

  // Create a snapshot hash to detect meaningful changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const initialSnapshot = createKitSnapshot(kitState, kitQuantity);
      persistedSnapshotRef.current = initialSnapshot;
      latestSnapshotRef.current = initialSnapshot;
      return;
    }

    const newSnapshot = createKitSnapshot(kitState, kitQuantity);
    latestSnapshotRef.current = newSnapshot;
    latestStateRef.current = { kitState, kitQuantity };

    if (baselineNextRef.current) {
      baselineNextRef.current = false;
      persistedSnapshotRef.current = newSnapshot;
      setIsDirty(false);
      return;
    }

    if (newSnapshot === persistedSnapshotRef.current) {
      setIsDirty(false);
      return;
    }
    setIsDirty(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void saveToDb(newSnapshot, { kitState, kitQuantity }), AUTO_SAVE_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [kitState, kitQuantity, saveToDb]);

  // Uma troca de usuário/kit invalida timers e respostas pendentes. Gravações
  // já enviadas terminam no registro de origem, mas nunca contaminam o novo
  // contexto; a fila mantém a ordem das alterações dentro do mesmo kit.
  useEffect(() => {
    const nextScope = `${user?.id ?? 'anon'}:${currentKitId ?? 'new'}`;
    if (scopeRef.current === nextScope) return;

    // O pai adota o ID que esta própria instância acabou de criar. Essa
    // passagem de `new` para o ID persistido continua sendo o mesmo kit e não
    // pode invalidar uma alteração que já esteja aguardando na fila.
    const adoptsCreatedKit = isCreatedKitAdoption(
      user?.id,
      currentKitId,
      kitIdRef.current,
      scopeRef.current,
    );
    if (adoptsCreatedKit) {
      scopeRef.current = nextScope;
      return;
    }

    scopeRef.current = nextScope;
    scopeGenerationRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    kitIdRef.current = currentKitId || null;
    setAutoSavedKitId(currentKitId || null);
    setLastSavedAt(null);
    setLastSaveError(null);
    setIsSaving(false);
    const snapshot = createKitSnapshot(kitState, kitQuantity);
    persistedSnapshotRef.current = snapshot;
    latestSnapshotRef.current = snapshot;
    setIsDirty(false);
  }, [currentKitId, user?.id, kitState, kitQuantity]);

  // Salvamento manual (fora do autosave) também pode marcar o estado como
  // persistido; passa o snapshot do momento da gravação para não limpar
  // edições feitas enquanto a requisição estava pendente.
  const markPersisted = useCallback((snapshot: string) => {
    persistedSnapshotRef.current = snapshot;
    setIsDirty(latestSnapshotRef.current !== snapshot);
  }, []);

  // Carga assíncrona (ex.: abrir /montar-kit?kit=...) preenche o kit depois
  // do baseline inicial: o próximo snapshot calculado passa a ser o
  // estado persistido — os dados carregados não são "edição não salva".
  const markNextSnapshotPersisted = useCallback(() => {
    baselineNextRef.current = true;
  }, []);

  const retry = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const snapshot = latestSnapshotRef.current;
    if (snapshot && snapshot !== persistedSnapshotRef.current) void saveToDb(snapshot, latestStateRef.current);
  }, [saveToDb]);

  return { lastSavedAt, isSaving, autoSavedKitId, lastSaveError, isDirty, markPersisted, markNextSnapshotPersisted, retry };
}
