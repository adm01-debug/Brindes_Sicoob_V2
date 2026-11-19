/**
 * Contrato da política de acesso ao CRM pelo portal.
 *
 * Este módulo decide 403 para os papéis `vendedor` e `agente` e entrou no
 * repositório sem nenhum teste. A forma da request é validada ANTES do papel:
 * uma request malformada é negada até para `dev`, e foi exatamente isso que
 * quebrou o seletor de empresa do carrinho quando ele pedia `limit: 500`.
 *
 * Vitest exclui `supabase/functions/**\/*.test.ts` (vitest.config.ts), por isso o
 * teste mora aqui e importa por caminho relativo — mesmo padrão de
 * tests/functions/scheduled-report-email.test.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  canAccessCrmRequest,
  canReadCrm,
  canWriteCrm,
  isQuoteDirectoryRequest,
} from '../../supabase/functions/_shared/portal-access-policy';

const VENDEDOR = ['vendedor'];
const AGENTE = ['agente'];
const SUPERVISOR = ['supervisor'];
const DEV = ['dev'];
const UUID = '11111111-1111-4111-8111-111111111111';

describe('papéis de leitura e escrita do CRM', () => {
  it('não dá leitura genérica a vendedor nem a agente', () => {
    expect(canReadCrm(VENDEDOR)).toBe(false);
    expect(canReadCrm(AGENTE)).toBe(false);
    expect(canReadCrm(SUPERVISOR)).toBe(true);
    expect(canReadCrm(DEV)).toBe(true);
  });

  it('restringe escrita a dev e admin', () => {
    expect(canWriteCrm(VENDEDOR)).toBe(false);
    expect(canWriteCrm(SUPERVISOR)).toBe(false);
    expect(canWriteCrm(DEV)).toBe(true);
    expect(canWriteCrm(['admin'])).toBe(true);
  });

  it('nega tudo para quem não tem papel', () => {
    expect(canAccessCrmRequest([], { operation: 'select', table: 'companies' })).toBe(false);
    expect(
      canAccessCrmRequest([], { operation: 'quote_directory', action: 'companies', limit: 10 }),
    ).toBe(false);
  });
});

describe('forma da request do contrato fechado', () => {
  it('aceita companies até 100 e nega 101', () => {
    expect(isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'companies', limit: 100 })).toBe(true);
    expect(isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'companies', limit: 101 })).toBe(false);
  });

  it('aceita contacts até 50 e nega 51', () => {
    expect(
      isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'contacts', companyId: UUID, limit: 50 }),
    ).toBe(true);
    expect(
      isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'contacts', companyId: UUID, limit: 51 }),
    ).toBe(false);
  });

  it('nega contacts com offset ou sem companyId válido', () => {
    expect(
      isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'contacts', companyId: UUID, limit: 10, offset: 0 }),
    ).toBe(false);
    expect(
      isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'contacts', companyId: 'nao-e-uuid', limit: 10 }),
    ).toBe(false);
  });

  it('nega qualquer tentativa de escolher tabela, projeção ou filtro', () => {
    for (const extra of [
      { table: 'contacts' },
      { select: 'id, email' },
      { filters: { is_customer: true } },
      { orderBy: 'razao_social' },
      { search: { column: 'razao_social', term: 'x' } },
      { relations: 'contacts(*)' },
      { id: UUID },
      { count: true },
      { head: true },
      { data: { nome: 'x' } },
      { returning: '*' },
      { queries: [] },
    ]) {
      expect(
        isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'companies', limit: 10, ...extra }),
      ).toBe(false);
    }
  });

  it('exige termo de busca com 2 a 100 caracteres', () => {
    expect(isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'companies', limit: 10, term: 'a' })).toBe(false);
    expect(isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'companies', limit: 10, term: 'ab' })).toBe(true);
    expect(
      isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'companies', limit: 10, term: 'x'.repeat(101) }),
    ).toBe(false);
  });

  it('limita o offset de companies a 10.000', () => {
    expect(isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'companies', limit: 10, offset: 10_000 })).toBe(true);
    expect(isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'companies', limit: 10, offset: 10_001 })).toBe(false);
    expect(isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'companies', limit: 10, offset: -1 })).toBe(false);
  });

  it('nega ação desconhecida e operação diferente', () => {
    expect(isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'tudo', limit: 10 })).toBe(false);
    expect(isQuoteDirectoryRequest({ operation: 'select', action: 'companies', limit: 10 })).toBe(false);
  });
});

describe('pares do mesmo ramo de atividade', () => {
  it('aceita somente ramoAtividade, com o teto fixo no servidor', () => {
    expect(
      isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'industry_peers', ramoAtividade: 'Cooperativa de crédito' }),
    ).toBe(true);
  });

  it('nega ramo curto, ramo longo e ramo ausente', () => {
    expect(isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'industry_peers', ramoAtividade: 'a' })).toBe(false);
    expect(
      isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'industry_peers', ramoAtividade: 'x'.repeat(101) }),
    ).toBe(false);
    expect(isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'industry_peers' })).toBe(false);
  });

  it('não deixa o cliente escolher limite, offset, termo nem empresa', () => {
    for (const extra of [{ limit: 500 }, { offset: 0 }, { term: 'abc' }, { companyId: UUID }]) {
      expect(
        isQuoteDirectoryRequest({
          operation: 'quote_directory',
          action: 'industry_peers',
          ramoAtividade: 'Comércio',
          ...extra,
        }),
      ).toBe(false);
    }
  });

  it('não deixa ramoAtividade vazar para companies nem contacts', () => {
    expect(
      isQuoteDirectoryRequest({ operation: 'quote_directory', action: 'companies', limit: 10, ramoAtividade: 'Comércio' }),
    ).toBe(false);
    expect(
      isQuoteDirectoryRequest({
        operation: 'quote_directory',
        action: 'contacts',
        companyId: UUID,
        limit: 10,
        ramoAtividade: 'Comércio',
      }),
    ).toBe(false);
  });
});

describe('quem pode usar cada operação', () => {
  const directory = { operation: 'quote_directory', action: 'companies', limit: 100 } as const;

  it('libera o contrato fechado para vendedor, agente e supervisão', () => {
    expect(canAccessCrmRequest(VENDEDOR, directory)).toBe(true);
    expect(canAccessCrmRequest(AGENTE, directory)).toBe(true);
    expect(canAccessCrmRequest(SUPERVISOR, directory)).toBe(true);
    expect(canAccessCrmRequest(DEV, directory)).toBe(true);
  });

  it('nega select, search e batch para vendedor e agente', () => {
    for (const papeis of [VENDEDOR, AGENTE]) {
      expect(canAccessCrmRequest(papeis, { operation: 'select', table: 'companies' })).toBe(false);
      expect(canAccessCrmRequest(papeis, { operation: 'search', table: 'companies' })).toBe(false);
      expect(canAccessCrmRequest(papeis, { operation: 'batch', queries: [] })).toBe(false);
    }
  });

  it('mantém select e search para supervisão', () => {
    expect(canAccessCrmRequest(SUPERVISOR, { operation: 'select', table: 'companies' })).toBe(true);
    expect(canAccessCrmRequest(SUPERVISOR, { operation: 'search', table: 'companies' })).toBe(true);
  });

  it('nega request malformada mesmo para dev — a forma vem antes do papel', () => {
    const acimaDoTeto = { operation: 'quote_directory', action: 'companies', limit: 500 } as const;
    expect(canAccessCrmRequest(DEV, acimaDoTeto)).toBe(false);
    expect(canAccessCrmRequest(SUPERVISOR, acimaDoTeto)).toBe(false);
    expect(canAccessCrmRequest(VENDEDOR, acimaDoTeto)).toBe(false);
  });
});
