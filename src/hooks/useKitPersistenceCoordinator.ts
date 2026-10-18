import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { KitState } from '@/lib/kit-builder';
import {
  buildCustomKitPayload,
  buildKitTemplatePayload,
  buildKitTemplateUpdatePayload,
  createKitPersistenceSnapshot,
  serializeKitPersistenceSnapshot,
  type KitPersistenceSnapshot,
} from '@/lib/kit-builder/persistence';
import {
  KitPersistenceCoordinator,
  type KitPersistenceIntent,
  type KitPersistenceResult,
} from '@/lib/kit-builder/persistence-coordinator';
import { logger } from '@/lib/logger';

const AUTO_SAVE_DELAY_MS = 5_000;

type PersistenceMode =
  | { kind: 'custom'; kitId?: string; expectedUpdatedAt?: string; sessionKey: string | number }
  | { kind: 'template'; templateId: string };

interface UseKitPersistenceCoordinatorInput {
  kitState: KitState;
  kitQuantity: number;
  mode: PersistenceMode;
  enabled?: boolean;
}

interface PendingCounts {
  automatic: number;
  manual: number;
}

type ModeKind = PersistenceMode['kind'];

interface ResolvedMode {
  kind: ModeKind;
  id?: string;
  initialTargetId: string | null;
  initialExpectedUpdatedAt?: string;
  scopeKey: string;
}

interface ExecutePersistenceInput {
  modeKind: ModeKind;
  modeId?: string;
  userId: string;
  targetId: string | null;
  expectedUpdatedAt?: string;
  onCustomKitPersisted?: (updatedAt: string) => void;
  snapshot: KitPersistenceSnapshot;
}

function hasContent(snapshot: KitPersistenceSnapshot): boolean {
  return Boolean(snapshot.box) || snapshot.items.length > 0;
}

function requiredId(
  result: { data: { id: string } | null; error: unknown },
  emptyMessage: string,
): string {
  if (result.error) throw result.error;
  if (!result.data?.id) throw new Error(emptyMessage);
  return result.data.id;
}

async function persistCustomKit(
  userId: string,
  targetId: string | null,
  expectedUpdatedAt: string | undefined,
  snapshot: KitPersistenceSnapshot,
): Promise<{ id: string; updatedAt: string }> {
  const payload = buildCustomKitPayload(userId, snapshot);
  if (targetId) {
    if (!expectedUpdatedAt) {
      throw new Error('Versão do kit ausente. Recarregue o kit antes de salvar.');
    }
    const nextUpdatedAt = new Date().toISOString();
    payload.updated_at = nextUpdatedAt <= expectedUpdatedAt
      ? new Date(new Date(expectedUpdatedAt).getTime() + 1).toISOString()
      : nextUpdatedAt;
    const result = await supabase
      .from('custom_kits')
      .update(payload)
      .eq('id', targetId)
      .eq('user_id', userId)
      .eq('updated_at', expectedUpdatedAt)
      .select('id, updated_at')
      .maybeSingle();
    const id = requiredId(result, 'Este kit foi alterado em outra aba ou não está mais disponível. Recarregue-o antes de salvar.');
    const updatedAt = (result.data as { updated_at?: string } | null)?.updated_at;
    if (!updatedAt) throw new Error('O banco não retornou a nova versão do kit. Recarregue antes de continuar.');
    return { id, updatedAt };
  }

  const result = await supabase.from('custom_kits').insert(payload).select('id, updated_at').single();
  const id = requiredId(result, 'O kit não retornou um identificador após o salvamento.');
  const updatedAt = (result.data as { updated_at?: string } | null)?.updated_at;
  if (!updatedAt) throw new Error('O banco não retornou a versão do kit recém-criado.');
  return { id, updatedAt };
}

async function persistTemplate(
  templateId: string,
  snapshot: KitPersistenceSnapshot,
): Promise<string> {
  const result = await supabase
    .from('kit_templates')
    .update(buildKitTemplateUpdatePayload(snapshot))
    .eq('id', templateId)
    .select('id')
    .maybeSingle();
  return requiredId(result, 'O template não foi encontrado ou você não tem permissão para atualizá-lo.');
}

async function persistTemplateCopy(snapshot: KitPersistenceSnapshot): Promise<string> {
  const result = await supabase
    .from('kit_templates')
    .insert(buildKitTemplatePayload(snapshot))
    .select('id')
    .single();
  return requiredId(result, 'O template não retornou um identificador após o salvamento.');
}

function resolveMode(mode: PersistenceMode, userId?: string): ResolvedMode {
  const owner = userId ?? 'anon';
  if (mode.kind === 'template') {
    return {
      kind: mode.kind,
      id: mode.templateId,
      initialTargetId: mode.templateId,
      scopeKey: `${owner}:template:${mode.templateId}`,
    };
  }
  return {
    kind: mode.kind,
    id: mode.kitId,
    initialTargetId: mode.kitId ?? null,
    initialExpectedUpdatedAt: mode.expectedUpdatedAt,
    scopeKey: `${owner}:custom:${mode.kitId ?? 'new'}:${mode.sessionKey}`,
  };
}

async function executePersistence(input: ExecutePersistenceInput): Promise<string> {
  if (input.modeKind === 'custom') {
    const persisted = await persistCustomKit(input.userId, input.targetId, input.expectedUpdatedAt, input.snapshot);
    input.onCustomKitPersisted?.(persisted.updatedAt);
    return persisted.id;
  }
  if (!input.modeId) throw new Error('Template não identificado');
  return persistTemplate(input.modeId, input.snapshot);
}

async function invalidatePersistenceQueries(queryClient: QueryClient, modeKind: ModeKind): Promise<void> {
  if (modeKind === 'custom') {
    await queryClient.invalidateQueries({ queryKey: ['custom-kits'] });
    return;
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin-kit-templates'] }),
    queryClient.invalidateQueries({ queryKey: ['kit-templates'] }),
  ]);
}

function notifyPersistenceSuccess(intent: KitPersistenceIntent, modeKind: ModeKind): void {
  if (intent !== 'manual') return;
  toast.success(modeKind === 'template' ? 'Template do sistema salvo!' : 'Kit salvo com sucesso!');
}

function notifyPersistenceFailure(intent: KitPersistenceIntent, modeKind: ModeKind, message: string): void {
  if (intent === 'automatic') {
    toast.error('O salvamento automático falhou. Seus dados continuam nesta página.', {
      description: 'Tente salvar novamente antes de sair.',
    });
    return;
  }
  const subject = modeKind === 'template' ? 'template' : 'kit';
  toast.error(`Erro ao salvar ${subject}: ${message}`);
}

function requireUserId(userId?: string): string {
  if (!userId) throw new Error('Usuário não autenticado');
  return userId;
}

// O helper recebe os dois setters para manter contadores de fila e UI atômicos.
// eslint-disable-next-line max-params
function updatePending(
  pending: PendingCounts,
  intent: KitPersistenceIntent,
  delta: 1 | -1,
  setIsAutoSaving: (value: boolean) => void,
  setIsSaving: (value: boolean) => void,
): void {
  pending[intent] = Math.max(0, pending[intent] + delta);
  setIsAutoSaving(pending.automatic > 0);
  setIsSaving(pending.manual > 0);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível salvar o kit.';
}

function staleWriteReturnedToActiveScope(
  result: KitPersistenceResult,
  operationScope: string,
  activeScope: string,
): boolean {
  return result.stale && result.executed && operationScope === activeScope;
}

function persistenceResultIsInactive(
  result: KitPersistenceResult,
  operationScope: string,
  activeScope: string,
): boolean {
  return result.stale || operationScope !== activeScope;
}

// A coordenação mantém refs, efeitos e estado público juntos para garantir uma
// única fila por instância; dividi-la criaria novamente filas concorrentes.
// eslint-disable-next-line max-lines-per-function
export function useKitPersistenceCoordinator({
  kitState,
  kitQuantity,
  mode,
  enabled = true,
}: UseKitPersistenceCoordinatorInput) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const resolvedMode = resolveMode(mode, user?.id);
  const { kind: modeKind, id: modeId, initialTargetId, initialExpectedUpdatedAt, scopeKey } = resolvedMode;
  const coordinatorRef = useRef(new KitPersistenceCoordinator());
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingRef = useRef<PendingCounts>({ automatic: 0, manual: 0 });
  const wasEnabledRef = useRef(enabled);
  const snapshot = createKitPersistenceSnapshot(kitState, kitQuantity);
  const serializedSnapshot = serializeKitPersistenceSnapshot(snapshot);
  const latestSnapshotRef = useRef(snapshot);
  const latestSerializedRef = useRef(serializedSnapshot);
  latestSnapshotRef.current = snapshot;
  latestSerializedRef.current = serializedSnapshot;

  const scopeKeyRef = useRef(scopeKey);
  scopeKeyRef.current = scopeKey;
  const expectedUpdatedAtRef = useRef(initialExpectedUpdatedAt);

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const [resolvedKitId, setResolvedKitId] = useState<string | null>(initialTargetId);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [staleWriteRevision, setStaleWriteRevision] = useState(0);
  const [, setBaselineRevision] = useState(0);

  useLayoutEffect(() => {
    const coordinator = coordinatorRef.current;
    const previousGeneration = coordinator.getGeneration();
    const nextGeneration = coordinator.activateScope(scopeKey, initialTargetId, latestSerializedRef.current);
    expectedUpdatedAtRef.current = initialExpectedUpdatedAt;
    if (previousGeneration === nextGeneration) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = { automatic: 0, manual: 0 };
    setResolvedKitId(initialTargetId);
    setLastSavedAt(null);
    setLastSaveError(null);
    setIsAutoSaving(false);
    setIsSaving(false);
    setBaselineRevision((revision) => revision + 1);
  }, [initialExpectedUpdatedAt, initialTargetId, scopeKey]);

  useLayoutEffect(() => {
    const becameReady = enabled && !wasEnabledRef.current;
    wasEnabledRef.current = enabled;
    if (!becameReady) return;

    const coordinator = coordinatorRef.current;
    const generation = coordinator.getGeneration();
    if (!coordinator.adoptBaseline(latestSerializedRef.current, generation)) return;
    setLastSaveError(null);
    setBaselineRevision((revision) => revision + 1);
  }, [enabled, scopeKey]);

  const runPersistence = useCallback(async (
    intent: KitPersistenceIntent,
    operationSnapshot: KitPersistenceSnapshot,
  ): Promise<string | null> => {
    const userId = requireUserId(user?.id);
    const operationScope = scopeKeyRef.current;
    const operationSerialized = serializeKitPersistenceSnapshot(operationSnapshot);
    updatePending(pendingRef.current, intent, 1, setIsAutoSaving, setIsSaving);

    try {
      const result = await coordinatorRef.current.enqueue({
        snapshot: operationSerialized,
        execute: async (targetId) => {
          const persistedId = await executePersistence({
            modeKind,
            modeId,
            userId,
            targetId,
            expectedUpdatedAt: expectedUpdatedAtRef.current,
            onCustomKitPersisted: (updatedAt) => {
              if (operationScope === scopeKeyRef.current) expectedUpdatedAtRef.current = updatedAt;
            },
            snapshot: operationSnapshot,
          });
          return { targetId: persistedId };
        },
      });

      if (staleWriteReturnedToActiveScope(result, operationScope, scopeKeyRef.current)) {
        setStaleWriteRevision((revision) => revision + 1);
      }
      if (persistenceResultIsInactive(result, operationScope, scopeKeyRef.current)) return null;
      const persistedId = result.targetId ?? coordinatorRef.current.getTargetId();
      setResolvedKitId(persistedId ?? null);
      setLastSavedAt(new Date());
      setLastSaveError(null);
      await invalidatePersistenceQueries(queryClient, modeKind);
      notifyPersistenceSuccess(intent, modeKind);
      return persistedId ?? null;
    } catch (error) {
      if (operationScope !== scopeKeyRef.current) return null;
      const message = errorMessage(error);
      logger.warn('[kit-persistence] Falha ao salvar:', error);
      setLastSaveError(message);
      notifyPersistenceFailure(intent, modeKind, message);
      throw error;
    } finally {
      if (operationScope === scopeKeyRef.current) {
        updatePending(pendingRef.current, intent, -1, setIsAutoSaving, setIsSaving);
      }
    }
  }, [modeId, modeKind, queryClient, user?.id]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!enabled || modeKind !== 'custom' || !user?.id || !hasContent(latestSnapshotRef.current)) return;
    if (!coordinatorRef.current.isDirty(serializedSnapshot)) return;

    timerRef.current = setTimeout(() => {
      void runPersistence('automatic', latestSnapshotRef.current).catch(() => undefined);
    }, AUTO_SAVE_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, modeKind, runPersistence, serializedSnapshot, user?.id]);

  const saveNow = useCallback(async (): Promise<string | null> => {
    if (!enabled) throw new Error('Aguarde o carregamento do kit antes de salvar.');
    if (timerRef.current) clearTimeout(timerRef.current);
    return runPersistence('manual', latestSnapshotRef.current);
  }, [enabled, runPersistence]);

  const saveAsTemplate = useCallback(async (): Promise<string | null> => {
    if (!enabled) throw new Error('Aguarde o carregamento do kit antes de salvar.');
    const userId = requireUserId(user?.id);
    const operationScope = scopeKeyRef.current;
    const operationSnapshot = latestSnapshotRef.current;
    updatePending(pendingRef.current, 'manual', 1, setIsAutoSaving, setIsSaving);
    try {
      const result = await coordinatorRef.current.enqueue({
        snapshot: serializeKitPersistenceSnapshot(operationSnapshot),
        adoptTarget: false,
        adoptBaseline: false,
        execute: async () => ({ targetId: await persistTemplateCopy(operationSnapshot) }),
      });
      if (result.stale || operationScope !== scopeKeyRef.current) return null;
      await invalidatePersistenceQueries(queryClient, 'template');
      toast.success('Template do sistema salvo!');
      return result.targetId ?? null;
    } catch (error) {
      if (operationScope !== scopeKeyRef.current) return null;
      const message = errorMessage(error);
      logger.warn(`[kit-persistence] Falha ao salvar template para ${userId}:`, error);
      toast.error(`Erro ao salvar template: ${message}`);
      throw error;
    } finally {
      if (operationScope === scopeKeyRef.current) {
        updatePending(pendingRef.current, 'manual', -1, setIsAutoSaving, setIsSaving);
      }
    }
  }, [enabled, queryClient, user?.id]);

  const retry = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void runPersistence('automatic', latestSnapshotRef.current).catch(() => undefined);
  }, [runPersistence]);

  return {
    saveNow,
    saveAsTemplate,
    retry,
    lastSavedAt,
    lastSaveError,
    resolvedKitId,
    isAutoSaving,
    isSaving,
    isDirty: coordinatorRef.current.isDirty(serializedSnapshot),
    staleWriteRevision,
  };
}
