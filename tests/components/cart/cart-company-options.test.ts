import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listQuoteDirectoryCompanies } from '@/lib/crm-db';
import { buildCartCompanyAccessScope, fetchCartCompanyOptions } from '@/components/cart/cart-company-options';
import type { QuoteDirectoryCompany } from '@/lib/crm-db';

vi.mock('@/lib/crm-db', () => ({
  listQuoteDirectoryCompanies: vi.fn(),
}));

function company(id: string, name: string): QuoteDirectoryCompany {
  return {
    id,
    name,
    razao_social: `${name} LTDA`,
    nome_fantasia: null,
    logo_url: null,
    ramo_atividade: null,
    cnpj: null,
  };
}

describe('opções de empresa do carrinho', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa o diretório restrito, preserva os IDs e percorre páginas de clientes', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      company(`crm-${String(index + 1).padStart(3, '0')}`, `Cooperativa Z ${index + 1}`),
    );
    const lastCompany = company('crm-501', 'Cooperativa A');
    vi.mocked(listQuoteDirectoryCompanies).mockResolvedValueOnce(firstPage).mockResolvedValueOnce([lastCompany]);

    const result = await fetchCartCompanyOptions();

    expect(listQuoteDirectoryCompanies).toHaveBeenNthCalledWith(
      1,
      { limit: 100, offset: 0 },
    );
    expect(listQuoteDirectoryCompanies).toHaveBeenNthCalledWith(
      2,
      { limit: 100, offset: 100 },
    );
    expect(result).toHaveLength(101);
    expect(result[0]).toEqual(expect.objectContaining({ id: 'crm-501', name: 'Cooperativa A' }));
    expect(listQuoteDirectoryCompanies).not.toHaveBeenCalledWith(expect.objectContaining({ term: expect.any(String) }));
  });

  it('particiona o cache por usuário e papéis', () => {
    expect(buildCartCompanyAccessScope('user-1', ['vendedor'])).not.toBe(
      buildCartCompanyAccessScope('user-2', ['vendedor']),
    );
    expect(buildCartCompanyAccessScope('user-1', ['comprador_pac'])).not.toBe(
      buildCartCompanyAccessScope('user-1', ['vendedor']),
    );
  });
});
