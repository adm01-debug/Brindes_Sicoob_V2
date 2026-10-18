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

  it('usa o diretório restrito, preserva os IDs e limita a resposta inicial', async () => {
    const initialCompanies = Array.from({ length: 100 }, (_, index) =>
      company(`crm-${String(index + 1).padStart(3, '0')}`, `Cooperativa Z ${index + 1}`),
    );
    vi.mocked(listQuoteDirectoryCompanies).mockResolvedValueOnce(initialCompanies);

    const result = await fetchCartCompanyOptions();

    expect(listQuoteDirectoryCompanies).toHaveBeenCalledExactlyOnceWith({ limit: 100 });
    expect(result).toHaveLength(100);
    expect(result[0]).toEqual(expect.objectContaining({ id: 'crm-001', name: 'Cooperativa Z 1' }));
  });

  it('consulta o servidor por termo para alcançar empresas fora da primeira página', async () => {
    const remoteCompany = company('crm-long-tail', 'Cooperativa Long Tail');
    vi.mocked(listQuoteDirectoryCompanies).mockResolvedValueOnce([remoteCompany]);

    const result = await fetchCartCompanyOptions('  long tail  ');

    expect(listQuoteDirectoryCompanies).toHaveBeenCalledExactlyOnceWith({ term: 'long tail', limit: 100 });
    expect(result[0]).toEqual(expect.objectContaining({ id: 'crm-long-tail', name: 'Cooperativa Long Tail' }));
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
