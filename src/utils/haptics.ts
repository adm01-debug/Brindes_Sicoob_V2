/**
 * haptics.ts — Utilitário para feedback tátil (vibrar) em dispositivos móveis.
 * Apenas em navegadores que suportam a API de Vibração (predominantemente Android).
 */

export const Haptics = {
  /** Vibração sutil (clique/sucesso) */
  impactLight: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  },

  /** Vibração média (ação concluída) */
  impactMedium: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  },

  /** Vibração de erro ou atenção */
  notificationError: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 50, 40]);
    }
  },

  /** Vibração de sucesso (double impact) */
  notificationSuccess: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 30, 20]);
    }
  }
};
