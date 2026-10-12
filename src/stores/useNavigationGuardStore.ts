import { create } from 'zustand';
import { trackUx } from '@/lib/uxMetrics';

interface GuardRequest {
  message: string;
  resolve: (leave: boolean) => void;
}

interface NavigationGuardState {
  request: GuardRequest | null;
  /** Escopos (páginas/formulários) com alterações não salvas registradas. */
  dirtyScopes: Record<string, boolean>;
  /** Abre o diálogo global de "alterações não salvas" e resolve `true` se o usuário confirmar a saída. */
  requestConfirmation: (message?: string) => Promise<boolean>;
  resolve: (leave: boolean) => void;
  /** Registra/remove um escopo com alterações não salvas (usar via useDirtyGuard). */
  setDirty: (scope: string, dirty: boolean) => void;
  /** Algum escopo registrado tem alterações não salvas? */
  hasDirty: () => boolean;
}

export const useNavigationGuardStore = create<NavigationGuardState>((set, get) => ({
  request: null,
  dirtyScopes: {},
  requestConfirmation: (message = 'Você tem alterações não salvas. Deseja realmente sair?') =>
    new Promise<boolean>((resolve) => {
      // Se já há um pedido aberto, cancela-o para não deixar a Promise pendurada.
      get().request?.resolve(false);
      trackUx('guard.shown');
      set({ request: { message, resolve } });
    }),
  resolve: (leave) => {
    const pending = get().request;
    if (!pending) return;
    trackUx(leave ? 'guard.confirm' : 'guard.cancel');
    set({ request: null });
    pending.resolve(leave);
  },
  setDirty: (scope, dirty) =>
    set((state) => {
      const next = { ...state.dirtyScopes };
      if (dirty) next[scope] = true;
      else delete next[scope];
      return { dirtyScopes: next };
    }),
  hasDirty: () => Object.keys(get().dirtyScopes).length > 0,
}));
