/**
 * Estados aceitos por `public.custom_kits`.
 *
 * Esta é a lista canônica: o gatilho `trg_validate_kit_status` (BEFORE INSERT
 * OR UPDATE) chama `validate_status_fields`, que levanta
 * `Invalid kit status: %` para qualquer valor fora destes quatro. Recuperado
 * da PR #119, fechada sem merge.
 */
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

export type CustomKitStatus = (typeof CUSTOM_KIT_STATUS)[keyof typeof CUSTOM_KIT_STATUS];
