import { create } from 'zustand';

export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive' | 'warning' | 'info';
}

interface ConfirmRequest extends ConfirmDialogOptions {
  resolve: (confirmed: boolean) => void;
}

interface ConfirmDialogState {
  request: ConfirmRequest | null;
  /** Abre o diálogo global de confirmação e resolve `true` quando o usuário confirma. */
  ask: (options: ConfirmDialogOptions) => Promise<boolean>;
  resolve: (confirmed: boolean) => void;
}

export const useConfirmDialogStore = create<ConfirmDialogState>((set, get) => ({
  request: null,
  ask: (options) =>
    new Promise<boolean>((resolve) => {
      // Se já há um pedido aberto, cancela-o para não deixar a Promise pendurada.
      get().request?.resolve(false);
      set({ request: { ...options, resolve } });
    }),
  resolve: (confirmed) => {
    const pending = get().request;
    if (!pending) return;
    set({ request: null });
    pending.resolve(confirmed);
  },
}));

/** Atalho para chamadas fora de componentes/hooks (qualquer .ts). */
export function askConfirm(options: ConfirmDialogOptions): Promise<boolean> {
  return useConfirmDialogStore.getState().ask(options);
}
