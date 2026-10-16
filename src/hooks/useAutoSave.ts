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
  const activeKey = useRef(key);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveOnUnmount = useRef<() => Promise<void>>(async () => {});
  const [lastError, setLastError] = useState<Error | null>(null);

  const save = useCallback(async () => {
    if (!enabled || !key) return;
    const currentDataStr = JSON.stringify(data);
    
    // Só salva se houver mudança e houver dados relevantes (ex: clientId no orçamento)
    if (currentDataStr === lastSavedData.current) return;

    try {
      // Persistência local
      const stored: StoredAutoSave<T> = {
        version: AUTO_SAVE_VERSION,
        savedAt: new Date().toISOString(),
        data,
      };
      localStorage.setItem(`autosave_${key}`, JSON.stringify(stored));
      
      // Persistência remota opcional
      if (onSave) {
        await onSave(data);
      }
      
      lastSavedData.current = currentDataStr;
      setLastError(null);
      log.info("saved", { key });
    } catch (error) {
      const saveError = error instanceof Error ? error : new Error("Não foi possível salvar o rascunho.");
      setLastError(saveError);
      onError?.(saveError);
      log.error("save_failed", { key, error: saveError });
    }
  }, [key, data, enabled, onError, onSave]);
  saveOnUnmount.current = save;

  useEffect(() => {
    if (activeKey.current === key) return;
    activeKey.current = key;
    lastSavedData.current = JSON.stringify(data);
    setLastError(null);
  }, [data, key]);

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

  useEffect(() => () => {
    void saveOnUnmount.current();
  }, []);

  // Função para restaurar dados
  const restore = useCallback((): T | null => {
    const saved = localStorage.getItem(`autosave_${key}`);
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
