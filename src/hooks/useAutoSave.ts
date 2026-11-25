import { useEffect, useRef, useCallback, useState } from 'react';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';

const log = createClientLogger('autosave');
const AUTO_SAVE_VERSION = 1;
const AUTO_SAVE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredAutoSave<T> {
  version: typeof AUTO_SAVE_VERSION;
  savedAt: string;
  data: T;
  /** Documento que gravou: evita que o descarte de uma aba apague o rascunho de outra. */
  tab?: string;
}

/**
 * Identidade deste documento (carregamento da pagina).
 *
 * Fica em memoria de proposito: duplicar a aba cria um documento novo com id
 * proprio, enquanto a comparacao por conteudo cobre o recarregamento, em que o
 * rascunho restaurado e exatamente o que a tela tem.
 */
const AUTOSAVE_ID_DOCUMENTO = (() => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
})();

const CONCURRENT_DRAFT_MESSAGE =
  'Este rascunho foi alterado em outra aba. Recarregue o orçamento antes de continuar.';

function readStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(`autosave_${key}`);
  } catch {
    return null;
  }
}

function readStoredData(value: string | null): unknown {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return (parsed as { data: unknown }).data;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function withDraftWriteLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(`sicoob-autosave:${key}`, operation);
  }
  return operation();
}

/**
 * Apaga o rascunho desta chave que pertence a esta tela.
 *
 * O rascunho e compartilhado entre abas do mesmo usuario e orcamento, entao o
 * descarte nao pode apagar o que outra aba gravou. Duas origens contam como
 * desta tela:
 *
 * - o documento que gravou (aba ou janela atual), mesmo que a copia guardada
 *   seja anterior a ultima edicao, que ainda nao passou pelo intervalo de
 *   gravacao;
 * - um rascunho com exatamente o conteudo informado, o que cobre o
 *   recarregamento: o rascunho restaurado e o que a tela tem.
 */
export function descartarRascunho(key: string, data: unknown): void {
  const storageKey = `autosave_${key}`;
  try {
    const atual = localStorage.getItem(storageKey);
    if (!atual) return;
    const gravadoPorEstaTela =
      (JSON.parse(atual) as { tab?: string }).tab === AUTOSAVE_ID_DOCUMENTO;
    if (!gravadoPorEstaTela && JSON.stringify(readStoredData(atual)) !== JSON.stringify(data)) return;
    localStorage.removeItem(storageKey);
  } catch {
    // Armazenamento bloqueado ou rascunho ilegivel: nada a apagar.
  }
}

function parseStoredAutoSave<T>(value: string): T | null {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed as T;

  const candidate = parsed as Partial<StoredAutoSave<T>>;
  if (
    candidate.version !== AUTO_SAVE_VERSION ||
    typeof candidate.savedAt !== 'string' ||
    !('data' in candidate)
  ) {
    // Compatibilidade com rascunhos gravados antes do envelope versionado.
    return parsed as T;
  }

  const savedAt = Date.parse(candidate.savedAt);
  if (!Number.isFinite(savedAt) || Date.now() - savedAt > AUTO_SAVE_RETENTION_MS) return null;
  return candidate.data as T;
}

interface AutoSaveOptions<T> {
  key: string;
  data: T;
  onSave?: (data: T) => void | Promise<void>;
  onError?: (error: Error) => void;
  interval?: number;
  enabled?: boolean;
}

interface DraftPersistenceArgs<T> {
  key: string;
  data: T;
  serializedData: string;
  storageSnapshot: { current: string | null };
  conflict: { current: boolean };
  onSave?: (data: T) => void | Promise<void>;
}

async function persistDraft<T>({
  key,
  data,
  serializedData,
  storageSnapshot,
  conflict,
  onSave,
}: DraftPersistenceArgs<T>) {
  await withDraftWriteLock(key, async () => {
    if (conflict.current) throw new Error(CONCURRENT_DRAFT_MESSAGE);

    const storageKey = `autosave_${key}`;
    const currentStoredValue = localStorage.getItem(storageKey);
    if (currentStoredValue === null && storageSnapshot.current !== null) {
      // Rascunho apagado por outra sessao (descarte confirmado): nao ha dado de
      // outra aba a proteger, e gravar de novo e a resposta certa.
      storageSnapshot.current = null;
    } else if (currentStoredValue !== storageSnapshot.current) {
      const externalData = JSON.stringify(readStoredData(currentStoredValue));
      if (externalData !== serializedData) {
        conflict.current = true;
        throw new Error(CONCURRENT_DRAFT_MESSAGE);
      }
    }

    const stored: StoredAutoSave<T> = {
      version: AUTO_SAVE_VERSION,
      savedAt: new Date().toISOString(),
      data,
      tab: AUTOSAVE_ID_DOCUMENTO,
    };
    const serialized = JSON.stringify(stored);
    localStorage.setItem(storageKey, serialized);
    storageSnapshot.current = serialized;
    if (onSave) await onSave(data);
  });
}

function useCrossTabDraftGuard<T>(args: {
  key: string;
  dataRef: { current: T };
  storageSnapshot: { current: string | null };
  conflict: { current: boolean };
  onError?: (error: Error) => void;
  setLastError: (error: Error | null) => void;
}) {
  const { key, dataRef, storageSnapshot, conflict, onError, setLastError } = args;

  useEffect(() => {
    storageSnapshot.current = readStoredValue(key);
    conflict.current = false;
    setLastError(null);
  }, [key, setLastError, storageSnapshot, conflict]);

  useEffect(() => {
    const storageKey = `autosave_${key}`;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      try {
        if (event.storageArea && event.storageArea !== localStorage) return;
      } catch {
        return;
      }
      storageSnapshot.current = event.newValue;
      if (event.newValue === null) {
        // A outra sessao apagou o rascunho (descarte confirmado). Nao ha versao
        // dela a proteger: a proxima gravacao desta aba volta a escrever.
        conflict.current = false;
        setLastError(null);
        return;
      }
      if (JSON.stringify(readStoredData(event.newValue)) === JSON.stringify(dataRef.current))
        return;

      conflict.current = true;
      const error = new Error(CONCURRENT_DRAFT_MESSAGE);
      setLastError(error);
      onError?.(error);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, onError, dataRef, storageSnapshot, conflict, setLastError]);
}

function useDraftPersistence<T>(args: {
  key: string;
  dataRef: { current: T };
  lastSavedData: { current: string };
  storageSnapshot: { current: string | null };
  conflict: { current: boolean };
  onSave?: (data: T) => void | Promise<void>;
  onError?: (error: Error) => void;
  setLastError: (error: Error | null) => void;
}) {
  const { key, dataRef, lastSavedData, storageSnapshot, conflict, onSave, onError, setLastError } =
    args;
  // A comparacao e com o que ja foi enfileirado, nao com o que ja terminou: com
  // uma gravacao em curso, a edicao mais nova precisa entrar na fila mesmo que
  // coincida com a ultima versao confirmada. A fila garante que a ultima
  // gravacao a chegar ao armazenamento seja a que reflete a tela.
  const ultimoEnfileirado = useRef<string>(JSON.stringify(dataRef.current));
  const fila = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    ultimoEnfileirado.current = lastSavedData.current;
  }, [key, lastSavedData]);

  return useCallback(async () => {
    const data = dataRef.current;
    const serializedData = JSON.stringify(data);
    if (serializedData === ultimoEnfileirado.current) return;
    ultimoEnfileirado.current = serializedData;

    const execucao = fila.current.then(async () => {
      try {
        await persistDraft({ key, data, serializedData, storageSnapshot, conflict, onSave });
        lastSavedData.current = serializedData;
        setLastError(null);
        log.info('saved', { key });
      } catch (error) {
        // Falhou: libera a mesma versao para nova tentativa.
        if (ultimoEnfileirado.current === serializedData) {
          ultimoEnfileirado.current = lastSavedData.current;
        }
      const saveError =
        error instanceof Error ? error : new Error('Não foi possível salvar o rascunho.');
      setLastError(saveError);
      onError?.(saveError);
        log.error('save_failed', { key, error: saveError });
      }
    });
    fila.current = execucao;
    await execucao;
  }, [key, dataRef, lastSavedData, storageSnapshot, conflict, onSave, onError, setLastError]);
}

function useDebouncedSave<T>(args: {
  data: T;
  enabled: boolean;
  interval: number;
  save: () => Promise<void>;
}) {
  const { data, enabled, interval, save } = args;
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      void save();
    }, interval);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [data, enabled, interval, save]);

  const estavaAtivo = useRef(enabled);
  useEffect(() => {
    // Desligar a persistência cancela o temporizador pendente. Se o usuário
    // editou enquanto uma chamada em curso tornava o orçamento imutável (envio,
    // aprovação), a alteração ficaria só na tela e se perderia ao fechar a aba:
    // grava o rascunho uma última vez antes de parar. `save()` não escreve nada
    // quando nada mudou.
    if (estavaAtivo.current && !enabled) void save();
    estavaAtivo.current = enabled;
  }, [enabled, save]);
}

function useRestoreDraft<T>(key: string, storageSnapshot: { current: string | null }) {
  return useCallback((): T | null => {
    const saved = readStoredValue(key);
    storageSnapshot.current = saved;
    if (!saved) return null;
    try {
      return parseStoredAutoSave<T>(saved);
    } catch {
      return null;
    }
  }, [key, storageSnapshot]);
}

/**
 * useAutoSave — Hook para persistência automática de rascunhos.
 * Salva no localStorage por padrão e opcionalmente dispara um callback (ex: salvar no DB).
 */
export function useAutoSave<T>({
  key,
  data,
  onSave,
  onError,
  interval = 2000,
  enabled = true,
}: AutoSaveOptions<T>) {
  const lastSavedData = useRef<string>(JSON.stringify(data));
  const dataRef = useRef(data);
  const storageSnapshot = useRef<string | null>(readStoredValue(key));
  const conflict = useRef(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  dataRef.current = data;
  useCrossTabDraftGuard({ key, dataRef, storageSnapshot, conflict, onError, setLastError });
  const save = useDraftPersistence({
    key,
    dataRef,
    lastSavedData,
    storageSnapshot,
    conflict,
    onSave,
    onError,
    setLastError,
  });
  useDebouncedSave({ data, enabled, interval, save });
  const restore = useRestoreDraft<T>(key, storageSnapshot);

  // Função para limpar rascunho
  const clear = useCallback(() => {
    localStorage.removeItem(`autosave_${key}`);
  }, [key]);

  return { restore, clear, lastSaved: lastSavedData.current, lastError };
}
