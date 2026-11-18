import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchQuoteDirectoryCompanies } from '@/lib/crm-db';
import { fetchCartCompanyOptions } from '@/components/cart/cart-company-options';
import type { QuoteDirectoryCompany } from '@/lib/crm-db';

vi.mock('@/lib/crm-db', () => ({
  fetchQuoteDirectoryCompanies: vi.fn(),
}));

function company(id: string, name: string): QuoteDirectoryCompany {
  return {
    id,
    name,
    razao_social: `${name} LTDA`,
    nome_fantasia: null,
    ramo_atividade: null,
    cnpj: null,
    logo_url: null,
    cidade: null,
    estado: null,
    website: null,
  };
}

describe('opções de empresa do carrinho', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserva os IDs do CRM e percorre todas as páginas de clientes', async () => {
    // O contrato fechado quote_directory nega limit > 100
    // (supabase/functions/_shared/portal-access-policy.ts:99), e a negação vem
    // antes da checagem de papel: um valor maior devolveria 403 até para dev.
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      company(`crm-${String(index + 1).padStart(3, '0')}`, `Cooperativa Z ${index + 1}`),
    );
    const lastCompany = company('crm-101', 'Cooperativa A');
    vi.mocked(fetchQuoteDirectoryCompanies)
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([lastCompany]);

    const result = await fetchCartCompanyOptions();

    expect(fetchQuoteDirectoryCompanies).toHaveBeenNthCalledWith(1, { limit: 100, offset: 0 });
    expect(fetchQuoteDirectoryCompanies).toHaveBeenNthCalledWith(2, { limit: 100, offset: 100 });
    expect(result).toHaveLength(101);
    expect(result[0]).toEqual(expect.objectContaining({ id: 'crm-101', name: 'Cooperativa A' }));
  });

  it('para de paginar quando a página vem incompleta', async () => {
    vi.mocked(fetchQuoteDirectoryCompanies).mockResolvedValueOnce([
      company('crm-001', 'Cooperativa Única'),
    ]);

    const result = await fetchCartCompanyOptions();

    expect(fetchQuoteDirectoryCompanies).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });
});
