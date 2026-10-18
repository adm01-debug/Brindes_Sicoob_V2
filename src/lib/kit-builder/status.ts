export const CUSTOM_KIT_STATUS = {
  DRAFT: 'draft',
  READY: 'ready',
  SHARED: 'shared',
  ARCHIVED: 'archived',
} as const;

export const CUSTOM_KIT_STATUS_LABELS: Record<string, string> = {
  [CUSTOM_KIT_STATUS.DRAFT]: 'Rascunho',
  [CUSTOM_KIT_STATUS.READY]: 'Pronto',
  [CUSTOM_KIT_STATUS.SHARED]: 'Compartilhado',
  [CUSTOM_KIT_STATUS.ARCHIVED]: 'Arquivado',
};
