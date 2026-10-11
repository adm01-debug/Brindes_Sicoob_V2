import { create } from 'zustand';

interface GuardRequest {
  message: string;
  resolve: (leave: boolean) => void;
}

interface NavigationGuardState {
  request: GuardRequest | null;
  /** Abre o diálogo global de "alterações não salvas" e resolve `true` se o usuário confirmar a saída. */
  requestConfirmation: (message?: string) => Promise<boolean>;
  resolve: (leave: boolean) => void;
}

export const useNavigationGuardStore = create<NavigationGuardState>((set, get) => ({
  request: null,
  requestConfirmation: (message = 'Você tem alterações não salvas. Deseja realmente sair?') =>
    new Promise<boolean>((resolve) => {
      // Se já há um pedido aberto, cancela-o para não deixar a Promise pendurada.
      get().request?.resolve(false);
      set({ request: { message, resolve } });
    }),
  resolve: (leave) => {
    const pending = get().request;
    if (!pending) return;
    set({ request: null });
    pending.resolve(leave);
  },
}));
