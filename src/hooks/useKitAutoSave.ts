/**
 * Kit Auto-Save Hook
 * Saves kit state automatically with debounce (5 seconds).
 * Only triggers after the user has made meaningful changes.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { KitState } from '@/lib/kit-builder';
import { buildCustomKitPayload } from '@/lib/kit-builder/custom-kit-payload';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const AUTO_SAVE_DELAY_MS = 5000;

interface AutoSaveResult {
  lastSavedAt: Date | null;
  isSaving: boolean;
  autoSavedKitId: string | null;
  lastSaveError: string | null;
  /** O erro atual é conflito com outra aba: repetir não resolve, recarregar sim. */
  lastSaveConflict: boolean;
  retry: () => void;
  /**
   * O salvamento manual grava na mesma linha e muda `updated_at`. Sem avisar o
   * autosave, a versão que esta aba conhece fica velha e a próxima gravação
   * automática é recusada como conflito — vindo da própria aba. Chamado pelo
   * "Salvar" depois do sucesso, ele adota a nova versão e marca como
   * persistido o que está na tela.
   */
  syncPersistedVersion: (updatedAt: string | null) => void;
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
    // A identidade entra no snapshot porque entrou no payload: sem isso, trocar
    // cor, ícone, etiqueta, descrição ou favorito não dispararia autosave algum.
    identity: kitState.identity,
  });
}

function requirePersistedKitId(
  result: { data: { id: string; updated_at?: string | null } | null; error: unknown },
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

function isEmptyKit(kitState: KitState) {
  return !kitState.box && kitState.items.length === 0;
}

export class KitConflitoDeEdicao extends Error {
  constructor() {
    super(
      'Este kit foi alterado em outro lugar depois que você abriu esta tela. ' +
        'Recarregue antes de continuar para não apagar a alteração.',
    );
    this.name = 'KitConflitoDeEdicao';
  }
}

/** Marca de versão da linha. `updated_at` é escrito pelo cliente: nenhum trigger
 *  de `custom_kits` o reescreve (só `enforce_user_id_owner` e
 *  `validate_status_fields`), então o valor que gravamos é o que volta. */
async function readKnownUpdatedAt(kitId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('custom_kits')
    .select('updated_at')
    .eq('id', kitId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.updated_at ?? null;
}

interface PersistResult {
  createdId: string | null;
  updatedAt: string | null;
}

/**
 * Zero linhas atualizadas tem duas causas, e elas pedem ações diferentes:
 * outra aba gravou (conflito, recarregue) ou a linha sumiu / a RLS cortou.
 */
async function explainEmptyUpdate(
  kitId: string,
  userId: string,
  baseline: string | null,
): Promise<never> {
  const aindaExiste = baseline ? await readKnownUpdatedAt(kitId, userId) : null;
  if (aindaExiste && aindaExiste !== baseline) throw new KitConflitoDeEdicao();
  throw new Error('O kit não foi encontrado ou você não tem permissão para atualizá-lo.');
}

/**
 * Trava otimista: a gravação só acontece se a linha continuar na versão que
 * esta aba conhece. Sem isso, duas abas no mesmo kit se sobrescrevem em
 * silêncio — a última gravação vence e o trabalho da outra some sem aviso.
 */
async function updateWithOptimisticLock(
  payload: ReturnType<typeof buildCustomKitPayload>,
  kitId: string,
  userId: string,
  expectedUpdatedAt: string | null,
): Promise<PersistResult> {
  // A versão é sempre a do conteúdo que está na tela: a linha lida ao abrir o
  // kit ou a devolvida pela própria gravação. Ler `updated_at` aqui, instantes
  // antes de gravar, adotaria a versão de quem gravou no meio-tempo e
  // sobrescreveria o trabalho dele sem conflito — exatamente o que a trava
  // existe para impedir.
  const baseline = expectedUpdatedAt;
  let query = supabase.from('custom_kits').update(payload).eq('id', kitId).eq('user_id', userId);
  if (baseline) query = query.eq('updated_at', baseline);
  const result = await query.select('id, updated_at').maybeSingle();
  if (result.error) throw result.error;
  if (!result.data?.id) await explainEmptyUpdate(kitId, userId, baseline);
  return { createdId: null, updatedAt: result.data?.updated_at ?? null };
}

const FALHA_GENERICA = 'Não foi possível salvar o kit automaticamente.';

/** Conflito não se resolve repetindo: regravar por cima apagaria o trabalho da outra aba. */
function avisarFalhaDeAutosave(conflito: boolean) {
  if (conflito) {
    toast.error('Este kit foi alterado em outro lugar.', {
      description: 'Recarregue a página antes de continuar para não apagar a alteração de lá.',
    });
    return;
  }
  toast.error('O salvamento automático falhou. Seus dados continuam nesta página.', {
    description: 'Tente salvar novamente antes de sair.',
  });
}

async function persistAutoSave(
  payload: ReturnType<typeof buildCustomKitPayload>,
  kitId: string | null,
  userId: string,
  expectedUpdatedAt: string | null,
): Promise<PersistResult> {
  if (kitId) return updateWithOptimisticLock(payload, kitId, userId, expectedUpdatedAt);

  const result = await supabase.from('custom_kits').insert(payload).select('id, updated_at').single();
  const createdId = requirePersistedKitId(result, 'O kit não retornou um identificador após o salvamento.');
  return { createdId, updatedAt: result.data?.updated_at ?? null };
}

/**
 * @param isReady  false enquanto o kit ainda está sendo carregado do banco.
 *   Abrir `/montar-kit?kit=ID` monta o hook com o ID já definido e o kit ainda
 *   vazio, então o baseline nascia vazio; quando a leitura chegava, o estado
 *   passava a diferir do baseline e o autosave regravava no banco, 5s depois,
 *   exatamente o que acabara de ler — mexendo em `updated_at` (a lista "Meus
 *   kits" reordena por ele), acendendo "salvo automaticamente" sem edição e
 *   abrindo uma janela para sobrescrever o que outra aba tivesse gravado.
 *   Enquanto `isReady` é false, mudança de estado é chegada de dado lido, não
 *   edição: vira baseline em vez de gravação.
 */
export function useKitAutoSave(
  kitState: KitState,
  kitQuantity: number,
  currentKitId: string | undefined,
  onKitIdCreated?: (id: string) => void,
  isReady = true,
  loadedUpdatedAt: string | null = null,
): AutoSaveResult {
  const { user } = useAuth();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSavedKitId, setAutoSavedKitId] = useState<string | null>(currentKitId || null);
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const [lastSaveConflict, setLastSaveConflict] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const persistedSnapshotRef = useRef<string>('');
  const latestSnapshotRef = useRef<string>('');
  const kitIdRef = useRef<string | null>(currentKitId || null);
  // Versão da linha que esta aba conhece, para a trava otimista.
  const knownUpdatedAtRef = useRef<string | null>(loadedUpdatedAt);
  const scopeRef = useRef(`${user?.id ?? 'anon'}:${currentKitId ?? 'new'}`);
  const scopeGenerationRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSavesRef = useRef(0);
  const isFirstRender = useRef(true);
  // Vira true no primeiro render em que `isReady` é true. O React 18 agrupa a
  // chegada do conteúdo lido e a conclusão da hidratação num mesmo render:
  // nesse render `isReady` já é true e o baseline ainda é o do kit vazio, logo
  // o teste `!isReady` sozinho não segura a regravação. O baseline é adotado
  // na transição para pronto, não enquanto não-pronto.
  const hasReadyBaselineRef = useRef(false);

  const adoptCreatedId = useCallback((createdId: string | null) => {
    if (!createdId) return;
    kitIdRef.current = createdId;
    setAutoSavedKitId(createdId);
    onKitIdCreated?.(createdId);
  }, [onKitIdCreated]);

  const saveToDb = useCallback(async (snapshot: string) => {
    if (!user?.id) return;

    // Don't auto-save empty kits
    if (isEmptyKit(kitState)) return;

    const payload = buildCustomKitPayload(user.id, kitState, kitQuantity);

    const operationGeneration = scopeGenerationRef.current;
    const operationUserId = user.id;
    const previousSave = saveQueueRef.current;
    let releaseQueue: () => void = () => undefined;
    saveQueueRef.current = new Promise<void>((resolve) => { releaseQueue = resolve; });
    pendingSavesRef.current += 1;
    setIsSaving(true);
    try {
      await previousSave;
      if (operationGeneration !== scopeGenerationRef.current) return;
      const persisted = await persistAutoSave(
        payload,
        kitIdRef.current,
        operationUserId,
        knownUpdatedAtRef.current,
      );
      adoptCreatedId(persisted.createdId);
      knownUpdatedAtRef.current = persisted.updatedAt;
      if (operationGeneration === scopeGenerationRef.current) {
        persistedSnapshotRef.current = snapshot;
        setLastSavedAt(new Date());
        setLastSaveError(null);
        setLastSaveConflict(false);
      }
    } catch (err) {
      if (operationGeneration !== scopeGenerationRef.current) return;
      logger.warn('[auto-save] Failed:', err);
      const conflito = err instanceof KitConflitoDeEdicao;
      setLastSaveError(err instanceof Error ? err.message : FALHA_GENERICA);
      setLastSaveConflict(conflito);
      avisarFalhaDeAutosave(conflito);
    } finally {
      releaseQueue();
      pendingSavesRef.current -= 1;
      if (operationGeneration === scopeGenerationRef.current) {
        setIsSaving(pendingSavesRef.current > 0);
      }
    }
  }, [adoptCreatedId, user?.id, kitState, kitQuantity]);

  // Create a snapshot hash to detect meaningful changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const initialSnapshot = createSnapshot(kitState, kitQuantity);
      persistedSnapshotRef.current = initialSnapshot;
      latestSnapshotRef.current = initialSnapshot;
      hasReadyBaselineRef.current = isReady;
      return;
    }

    const newSnapshot = createSnapshot(kitState, kitQuantity);
    latestSnapshotRef.current = newSnapshot;

    if (!isReady) {
      persistedSnapshotRef.current = newSnapshot;
      hasReadyBaselineRef.current = false;
      return;
    }

    if (!hasReadyBaselineRef.current) {
      // Primeiro render pronto: o que está na tela é o que foi lido do banco.
      hasReadyBaselineRef.current = true;
      persistedSnapshotRef.current = newSnapshot;
      return;
    }

    if (newSnapshot === persistedSnapshotRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void saveToDb(newSnapshot), AUTO_SAVE_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [kitState, kitQuantity, saveToDb, isReady]);

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
    knownUpdatedAtRef.current = loadedUpdatedAt;
    setAutoSavedKitId(currentKitId || null);
    setLastSavedAt(null);
    setLastSaveError(null);
    setLastSaveConflict(false);
    setIsSaving(false);
    const snapshot = createSnapshot(kitState, kitQuantity);
    persistedSnapshotRef.current = snapshot;
    latestSnapshotRef.current = snapshot;
  }, [currentKitId, user?.id, kitState, kitQuantity, loadedUpdatedAt]);

  // A leitura do kit chega depois do primeiro render: é aqui que a aba passa a
  // conhecer a versão do conteúdo que está mostrando.
  useEffect(() => {
    if (loadedUpdatedAt) knownUpdatedAtRef.current = loadedUpdatedAt;
  }, [loadedUpdatedAt]);

  const syncPersistedVersion = useCallback((updatedAt: string | null) => {
    // Descarta o que estiver na fila do autosave antes de adotar a versão nova.
    // Cada gravação enfileirada carrega um payload fotografado ANTES do
    // salvamento manual e só lê `knownUpdatedAtRef` na hora de gravar: adotar a
    // versão manual sem invalidar a fila deixaria uma dessas gravações velhas
    // passar pela trava e sobrescrever o que o "Salvar" acabou de confirmar.
    // A geração é o mesmo mecanismo que a troca de kit já usa (saveToDb
    // compara `operationGeneration` depois de esperar a fila).
    scopeGenerationRef.current += 1;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    knownUpdatedAtRef.current = updatedAt;
    persistedSnapshotRef.current = latestSnapshotRef.current;
    // O contador não é zerado: o `finally` de cada gravação descartada ainda
    // decrementa o seu. Quem some com o "Salvando…" é esta linha.
    setIsSaving(false);
    setLastSavedAt(new Date());
    setLastSaveError(null);
    setLastSaveConflict(false);
  }, []);

  const retry = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const snapshot = latestSnapshotRef.current;
    if (snapshot && snapshot !== persistedSnapshotRef.current) void saveToDb(snapshot);
  }, [saveToDb]);

  return {
    lastSavedAt, isSaving, autoSavedKitId, lastSaveError, lastSaveConflict, retry, syncPersistedVersion,
  };
}
