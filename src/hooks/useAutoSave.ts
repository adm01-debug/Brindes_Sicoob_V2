import { useEffect, useRef, useCallback, useState } from "react";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";

const log = createClientLogger("autosave");
const AUTO_SAVE_VERSION = 1;
const AUTO_SAVE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredAutoSave<T> {
  version: typeof AUTO_SAVE_VERSION;
  savedAt: string;
  data: T;
}

const CONCURRENT_DRAFT_MESSAGE = "Este rascunho foi alterado em outra aba. Recarregue o orçamento antes de continuar.";

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
    if (parsed && typeof parsed === "object" && "data" in parsed) {
      return (parsed as { data: unknown }).data;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function withDraftWriteLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(`sicoob-autosave:${key}`, operation);
  }
  return operation();
}

function parseStoredAutoSave<T>(value: string): T | null {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return parsed as T;

  const candidate = parsed as Partial<StoredAutoSave<T>>;
  if (candidate.version !== AUTO_SAVE_VERSION || typeof candidate.savedAt !== "string" || !("data" in candidate)) {
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
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  const storageSnapshot = useRef<string | null>(readStoredValue(key));
  const conflictRef = useRef(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  dataRef.current = data;

  useEffect(() => {
    storageSnapshot.current = readStoredValue(key);
    conflictRef.current = false;
    setLastError(null);
  }, [key]);

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

      if (JSON.stringify(readStoredData(event.newValue)) === JSON.stringify(dataRef.current)) return;

      conflictRef.current = true;
      const error = new Error(CONCURRENT_DRAFT_MESSAGE);
      setLastError(error);
      onError?.(error);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, onError]);

  const save = useCallback(async () => {
    const dataToSave = dataRef.current;
    const currentDataStr = JSON.stringify(dataToSave);
    
    // Só salva se houver mudança e houver dados relevantes (ex: clientId no orçamento)
    if (currentDataStr === lastSavedData.current) return;

    try {
      await withDraftWriteLock(key, async () => {
        if (conflictRef.current) throw new Error(CONCURRENT_DRAFT_MESSAGE);

        const storageKey = `autosave_${key}`;
        const currentStoredValue = localStorage.getItem(storageKey);
        if (currentStoredValue !== storageSnapshot.current) {
          const externalData = JSON.stringify(readStoredData(currentStoredValue));
          if (externalData !== currentDataStr) {
            conflictRef.current = true;
            throw new Error(CONCURRENT_DRAFT_MESSAGE);
          }
        }

        const stored: StoredAutoSave<T> = {
          version: AUTO_SAVE_VERSION,
          savedAt: new Date().toISOString(),
          data: dataToSave,
        };
        const serialized = JSON.stringify(stored);
        localStorage.setItem(storageKey, serialized);
        storageSnapshot.current = serialized;

        // Persistência remota opcional
        if (onSave) await onSave(dataToSave);
      });
      
      lastSavedData.current = currentDataStr;
      setLastError(null);
      log.info("saved", { key });
    } catch (error) {
      const saveError = error instanceof Error ? error : new Error("Não foi possível salvar o rascunho.");
      setLastError(saveError);
      onError?.(saveError);
      log.error("save_failed", { key, error: saveError });
    }
  }, [key, onError, onSave]);

  useEffect(() => {
    if (!enabled) return;

    // Debounce save on data change
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
    saveTimeout.current = setTimeout(() => {
      save();
    }, interval);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [data, enabled, interval, save]);

  // Função para restaurar dados
  const restore = useCallback((): T | null => {
    const saved = readStoredValue(key);
    storageSnapshot.current = saved;
    if (!saved) return null;
    try {
      return parseStoredAutoSave<T>(saved);
    } catch {
      return null;
    }
  }, [key]);

  // Função para limpar rascunho
  const clear = useCallback(() => {
    localStorage.removeItem(`autosave_${key}`);
  }, [key]);

  return { restore, clear, lastSaved: lastSavedData.current, lastError };
}
