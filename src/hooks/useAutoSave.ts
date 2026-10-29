import { useEffect, useRef, useCallback, useState } from 'react';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';

const log = createClientLogger('autosave');
const AUTO_SAVE_VERSION = 1;
const AUTO_SAVE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredAutoSave<T> {
  version: typeof AUTO_SAVE_VERSION;
  savedAt: string;
  data: T;
}

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
    if (currentStoredValue !== storageSnapshot.current) {
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
  return useCallback(async () => {
    const data = dataRef.current;
    const serializedData = JSON.stringify(data);
    if (serializedData === lastSavedData.current) return;

    try {
      await persistDraft({ key, data, serializedData, storageSnapshot, conflict, onSave });
      lastSavedData.current = serializedData;
      setLastError(null);
      log.info('saved', { key });
    } catch (error) {
      const saveError =
        error instanceof Error ? error : new Error('Não foi possível salvar o rascunho.');
      setLastError(saveError);
      onError?.(saveError);
      log.error('save_failed', { key, error: saveError });
    }
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
