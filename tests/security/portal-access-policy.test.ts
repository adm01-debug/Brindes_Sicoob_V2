import { describe, expect, it } from 'vitest';
import {
  canReadCrm,
  canUseClientContext,
  canWriteCrm,
  hasActivePortalMembership,
} from '../../supabase/functions/_shared/portal-access-policy';

describe('política de acesso privilegiado do portal', () => {
  it('falha fechado quando o usuário não possui papel', () => {
    expect(canReadCrm([])).toBe(false);
    expect(canWriteCrm([])).toBe(false);
    expect(canUseClientContext([])).toBe(false);
    expect(hasActivePortalMembership({ is_active: true, deleted_at: null }, [])).toBe(false);
  });

  it('avalia todos os papéis sem permitir que vendedor amplie o acesso', () => {
    const roles = ['vendedor', 'supervisor'];

    expect(canReadCrm(roles)).toBe(true);
    expect(canWriteCrm(roles)).toBe(false);
    expect(canUseClientContext(roles)).toBe(true);
  });

  it('nega CRM e clientId para vendedor', () => {
    expect(canReadCrm(['vendedor'])).toBe(false);
    expect(canWriteCrm(['vendedor'])).toBe(false);
    expect(canUseClientContext(['vendedor'])).toBe(false);
  });

  it('permite escrita somente a dev/admin', () => {
    expect(canWriteCrm(['dev'])).toBe(true);
    expect(canWriteCrm(['admin'])).toBe(true);
    expect(canWriteCrm(['supervisor'])).toBe(false);
    expect(canWriteCrm(['manager'])).toBe(false);
  });

  it('nega vínculo ausente, inativo ou excluído', () => {
    expect(hasActivePortalMembership(null, ['dev'])).toBe(false);
    expect(hasActivePortalMembership({ is_active: false, deleted_at: null }, ['dev'])).toBe(false);
    expect(hasActivePortalMembership({ is_active: true, deleted_at: '2026-01-01' }, ['dev'])).toBe(
      false,
    );
  });
});
