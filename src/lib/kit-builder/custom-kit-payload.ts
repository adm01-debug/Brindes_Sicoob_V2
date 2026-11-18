/**
 * Linha gravada em `custom_kits` a partir do estado do montador.
 *
 * O salvamento manual e o automático escrevem na MESMA linha, e por isso têm de
 * montar o MESMO payload. Enquanto cada um tinha o seu, os dois divergiram:
 * o automático fixava `status: 'draft'` e não enviava identidade nenhuma, então
 * cada autosave rebaixava para "Rascunho" um kit que o vendedor havia concluído
 * (o selo aparece em RecentKitsWidget), e o primeiro autosave de um kit novo
 * criava a linha sem a cor, o ícone, a etiqueta, a descrição e o favorito que o
 * usuário já tinha escolhido.
 */
import type { KitState } from '@/lib/kit-builder/types';

/** Status que o front grava. `saved` e `quoted` vêm de outros fluxos. */
export const CUSTOM_KIT_STATUS = {
  DRAFT: 'draft',
  COMPLETE: 'complete',
} as const;

export type CustomKitStatus = (typeof CUSTOM_KIT_STATUS)[keyof typeof CUSTOM_KIT_STATUS];

/** Um kit só é `complete` quando o montador o considera válido. */
export function customKitStatus(kitState: Pick<KitState, 'isValid'>): CustomKitStatus {
  return kitState.isValid ? CUSTOM_KIT_STATUS.COMPLETE : CUSTOM_KIT_STATUS.DRAFT;
}

function kitIdentityLabels(identity: KitState['identity']) {
  return {
    color: identity?.color ?? '#3B82F6',
    icon: identity?.icon ?? 'Package',
    tag: identity?.tag ?? null,
  };
}

function kitIdentityDetails(identity: KitState['identity']) {
  return {
    description: identity?.description ?? null,
    is_favorite: identity?.isFavorite ?? false,
  };
}

export function buildCustomKitPayload(userId: string, kitState: KitState, kitQuantity: number) {
  return {
    user_id: userId,
    name: kitState.name || 'Kit sem nome',
    status: customKitStatus(kitState),
    kit_type: kitState.kitType || 'montado',
    box_data: kitState.box ? JSON.parse(JSON.stringify(kitState.box)) : null,
    items_data: JSON.parse(JSON.stringify(kitState.items)),
    personalization_data: JSON.parse(JSON.stringify(kitState.personalization)),
    kit_quantity: kitQuantity,
    box_price: kitState.boxPrice,
    items_price: kitState.itemsPrice,
    personalization_price: kitState.personalizationPrice,
    total_price: kitState.totalPrice,
    volume_usage_percent: kitState.volumeUsagePercent,
    ...kitIdentityLabels(kitState.identity),
    ...kitIdentityDetails(kitState.identity),
    updated_at: new Date().toISOString(),
  };
}
