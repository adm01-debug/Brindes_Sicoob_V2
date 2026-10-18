import { describe, expect, it } from 'vitest';
import {
  canAccessCrmRequest,
  canReadCrm,
  canUseClientContext,
  canWriteCrm,
  hasActivePortalMembership,
} from '../../supabase/functions/_shared/portal-access-policy';

const quoteCompanyRequest = {
  operation: 'quote_directory',
  action: 'companies',
  limit: 100,
};

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

  it('permite ao vendedor e ao agente somente o DTO fechado de empresas do orçamento', () => {
    expect(canAccessCrmRequest(['vendedor'], quoteCompanyRequest)).toBe(true);
    expect(canAccessCrmRequest(['agente'], quoteCompanyRequest)).toBe(true);
    expect(canAccessCrmRequest(['vendedor'], { ...quoteCompanyRequest, select: '*' })).toBe(false);
    expect(canAccessCrmRequest(['vendedor'], { ...quoteCompanyRequest, limit: undefined })).toBe(
      false,
    );
    expect(canAccessCrmRequest(['vendedor'], { ...quoteCompanyRequest, table: 'companies' })).toBe(
      false,
    );
    expect(canAccessCrmRequest(['vendedor'], { ...quoteCompanyRequest, operation: 'update' })).toBe(
      false,
    );
    expect(canAccessCrmRequest(['vendedor'], { operation: 'batch', queries: [] })).toBe(false);
    expect(
      canAccessCrmRequest(['vendedor'], {
        ...quoteCompanyRequest,
        term: '12345678',
        limit: 50,
      }),
    ).toBe(true);
    expect(
      canAccessCrmRequest(['vendedor'], {
        ...quoteCompanyRequest,
        term: 'x',
      }),
    ).toBe(false);
    expect(
      canAccessCrmRequest(['vendedor'], {
        operation: 'select',
        table: 'companies',
        select: 'id, razao_social',
        filters: { deleted_at: null, is_customer: true },
        limit: 50,
      }),
    ).toBe(false);
  });

  it('libera contatos somente pela operação dedicada e por company UUID', () => {
    const companyId = '00000000-0000-4000-8000-000000000001';
    const contactsRequest = {
      operation: 'quote_directory',
      action: 'contacts',
      companyId,
      limit: 50,
    };

    expect(canAccessCrmRequest(['vendedor'], contactsRequest)).toBe(true);
    expect(canAccessCrmRequest(['agente'], contactsRequest)).toBe(true);
    for (const role of ['gerente_pa', 'comprador_pac']) {
      expect(canAccessCrmRequest([role], quoteCompanyRequest)).toBe(false);
      expect(canAccessCrmRequest([role], contactsRequest)).toBe(false);
      expect(canAccessCrmRequest([role], {
        operation: 'select', table: 'companies', select: 'id,razao_social', limit: 50,
      })).toBe(false);
    }
    expect(canAccessCrmRequest(['vendedor'], { ...contactsRequest, companyId: 'invalido' })).toBe(
      false,
    );
    expect(canAccessCrmRequest(['vendedor'], { ...contactsRequest, select: '*' })).toBe(false);
    expect(canAccessCrmRequest(['vendedor'], { ...contactsRequest, limit: undefined })).toBe(false);
    expect(canAccessCrmRequest(['vendedor'], { ...contactsRequest, term: 'cliente' })).toBe(
      false,
    );
  });

  it('bloqueia relações e projeções relacionais para qualquer papel não-dev, inclusive batch', () => {
    expect(
      canAccessCrmRequest(['admin'], {
        operation: 'select',
        table: 'companies',
        select: 'id,contacts(id)',
      }),
    ).toBe(false);
    expect(
      canAccessCrmRequest(['supervisor'], {
        operation: 'select',
        table: 'companies',
        relations: 'contacts(*)',
      }),
    ).toBe(false);
    expect(
      canAccessCrmRequest(['manager'], {
        operation: 'batch',
        queries: [{ table: 'companies', select: 'id,contacts!inner(id)' }],
      }),
    ).toBe(false);
    expect(
      canAccessCrmRequest(['dev'], {
        operation: 'batch',
        queries: [{ table: 'companies', select: 'id,contacts(id)' }],
      }),
    ).toBe(true);
  });

  it('mantém leitura ampla somente para gestão', () => {
    const arbitraryRead = { operation: 'select', table: 'customers' };
    expect(canAccessCrmRequest(['supervisor'], arbitraryRead)).toBe(true);
    expect(canAccessCrmRequest(['manager'], arbitraryRead)).toBe(true);
    expect(canAccessCrmRequest(['vendedor'], arbitraryRead)).toBe(false);
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
