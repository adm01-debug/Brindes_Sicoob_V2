import { useCallback } from "react";

const STORAGE_KEY_PREFIX = "quote_draft_";

interface QuoteDraft {
  id: string;
  data: any;
  savedAt: string;
  version: number;
}

/**
 * Hook para gerenciar o salvamento automático de rascunhos de orçamentos no localStorage.
 * Permite salvar, carregar e limpar rascunhos de forma imperativa.
 */
export function useAutoSave(quoteId?: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${quoteId || "new"}`;

  const saveDraft = useCallback((data: any) => {
    try {
      const draft: QuoteDraft = {
        id: quoteId || "new",
        data,
        savedAt: new Date().toISOString(),
        version: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(draft));
      
      // Também salva uma versão histórica (opcional)
      const versionKey = `${storageKey}_v${draft.version}`;
      localStorage.setItem(versionKey, JSON.stringify(draft));
      
      return true;
    } catch (error) {
      console.error("Erro ao salvar rascunho:", error);
      return false;
    }
  }, [storageKey, quoteId]);

  const loadDraft = useCallback((): any | null => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const draft: QuoteDraft = JSON.parse(stored);
        return draft.data;
      } catch (error) {
        console.error("Erro ao carregar rascunho:", error);
        return null;
      }
    }
    return null;
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      
      // Limpa versões históricas relacionadas
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(storageKey + "_v")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      
      return true;
    } catch (error) {
      console.error("Erro ao limpar rascunho:", error);
      return false;
    }
  }, [storageKey]);

  return { saveDraft, loadDraft, clearDraft };
}
