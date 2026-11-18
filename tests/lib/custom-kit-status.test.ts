/**
 * Contrato de status de `public.custom_kits`.
 *
 * O gatilho `trg_validate_kit_status` (BEFORE INSERT OR UPDATE) chama
 * `validate_status_fields`, que levanta `Invalid kit status: %` para qualquer
 * valor fora de ('draft','ready','shared','archived'). O front gravava
 * 'complete', que o banco rejeita: salvar um kit concluído falhava.
 *
 * A lista canônica foi recuperada da PR #119, fechada sem merge.
 */
import { describe, it, expect } from 'vitest';
import { CUSTOM_KIT_STATUS, CUSTOM_KIT_STATUS_LABELS } from '@/lib/kit-builder/status';
import { customKitStatus } from '@/lib/kit-builder/custom-kit-payload';

// Espelha exatamente o IF de validate_status_fields para custom_kits.
const ACEITOS_PELO_BANCO = ['draft', 'ready', 'shared', 'archived'] as const;

describe('status de custom_kits', () => {
  it('a lista do front é exatamente a que o gatilho aceita', () => {
    expect([...Object.values(CUSTOM_KIT_STATUS)].sort()).toEqual([...ACEITOS_PELO_BANCO].sort());
  });

  it('kit válido é gravado como "ready", nunca "complete"', () => {
    expect(customKitStatus({ isValid: true })).toBe('ready');
    expect(Object.values(CUSTOM_KIT_STATUS)).not.toContain('complete');
  });

  it('kit inválido continua rascunho', () => {
    expect(customKitStatus({ isValid: false })).toBe('draft');
  });

  it('todo status gravável tem rótulo em PT-BR para o selo do painel', () => {
    for (const status of ACEITOS_PELO_BANCO) {
      expect(CUSTOM_KIT_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});
