import { create } from 'zustand';

export interface DirtyScope {
  message: string;
}

export interface NavigationGuardRequest {
  id: number;
  currentPath: string;
  nextPath: string;
  historyAction: string;
  message: string;
}

interface NavigationGuardState {
  dirtyScopes: Record<string, DirtyScope>;
  request: NavigationGuardRequest | null;
  setDirty: (scope: string, dirty: boolean, message?: string) => void;
  hasDirty: () => boolean;
  getMessage: () => string;
  beginRequest: (request: Omit<NavigationGuardRequest, 'id' | 'message'>) => number;
  clearRequest: (requestId?: number) => void;
  clearAll: () => void;
}

const DEFAULT_MESSAGE = 'Você tem alterações não salvas. Deseja realmente sair?';
let nextRequestId = 0;

export const useNavigationGuardStore = create<NavigationGuardState>((set, get) => ({
  dirtyScopes: {},
  request: null,
  setDirty: (scope, dirty, message = DEFAULT_MESSAGE) => {
    set((state) => {
      const dirtyScopes = { ...state.dirtyScopes };
      if (dirty) dirtyScopes[scope] = { message };
      else delete dirtyScopes[scope];
      return { dirtyScopes };
    });
  },
  hasDirty: () => Object.keys(get().dirtyScopes).length > 0,
  getMessage: () => Object.values(get().dirtyScopes)[0]?.message ?? DEFAULT_MESSAGE,
  beginRequest: (request) => {
    nextRequestId += 1;
    set({
      request: {
        ...request,
        id: nextRequestId,
        message: get().getMessage(),
      },
    });
    return nextRequestId;
  },
  clearRequest: (requestId) => {
    const current = get().request;
    if (!current || (requestId !== undefined && current.id !== requestId)) return;
    set({ request: null });
  },
  clearAll: () => set({ dirtyScopes: {}, request: null }),
}));
