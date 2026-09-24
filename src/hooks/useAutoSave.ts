import { useEffect, useRef, useCallback, useState } from "react";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";

const log = createClientLogger("autosave");

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
  interval = 30000, // 30 segundos
  enabled = true,
}: AutoSaveOptions<T>) {
  const lastSavedData = useRef<string>(JSON.stringify(data));
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);

  const save = useCallback(async () => {
    const currentDataStr = JSON.stringify(data);
    
    // Só salva se houver mudança e houver dados relevantes (ex: clientId no orçamento)
    if (currentDataStr === lastSavedData.current) return;

    try {
      // Persistência local
      localStorage.setItem(`autosave_${key}`, currentDataStr);
      
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
  }, [key, data, onError, onSave]);

  useEffect(() => {
    if (!enabled) return;

    // Debounce save on data change
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
    saveTimeout.current = setTimeout(() => {
      save();
    }, 2000); // Salva 2 segundos após a última mudança

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [data, enabled, save]);

  // Função para restaurar dados
  const restore = useCallback((): T | null => {
    const saved = localStorage.getItem(`autosave_${key}`);
    if (!saved) return null;
    try {
      return JSON.parse(saved) as T;
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
