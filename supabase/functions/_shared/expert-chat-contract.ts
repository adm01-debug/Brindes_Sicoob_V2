/** Papéis que um cliente autenticado pode incluir no histórico enviado ao expert-chat. */
export const EXPERT_CHAT_CLIENT_MESSAGE_ROLES = ["user", "assistant"] as const;

/**
 * Teto de caracteres de uma mensagem do cliente. Fica aqui, e não só no
 * `index.ts`, porque o teste do contrato precisa medir o mesmo número — duas
 * cópias do limite davam um teste que passava enquanto o endpoint recusava.
 */
export const EXPERT_CHAT_MESSAGE_MAX_CHARS = 5000;
