import { beforeEach, describe, expect, it, vi } from 'vitest';
import { selectCrm } from '@/lib/crm-db';
import { fetchCartCompanyOptions } from '@/components/cart/cart-company-options';
import type { CrmCompany } from '@/types/crm';

vi.mock('@/lib/crm-db', () => ({
  selectCrm: vi.fn(),
}));

function company(id: string, name: string): CrmCompany {
  return {
    id,
    title: name,
    razao_social: `${name} LTDA`,
    nome_fantasia: null,
    logo_url: null,
    ramo_atividade: null,
  } as CrmCompany;
}

describe('opções de empresa do carrinho', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserva os IDs do CRM e percorre todas as páginas de clientes', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) =>
      company(`crm-${String(index + 1).padStart(3, '0')}`, `Cooperativa Z ${index + 1}`),
    );
    const lastCompany = company('crm-501', 'Cooperativa A');
    vi.mocked(selectCrm).mockResolvedValueOnce(firstPage).mockResolvedValueOnce([lastCompany]);

    const result = await fetchCartCompanyOptions();

    expect(selectCrm).toHaveBeenNthCalledWith(
      1,
      'companies',
      expect.objectContaining({
        filters: { deleted_at: null, is_customer: true },
        limit: 500,
        offset: 0,
      }),
    );
    expect(selectCrm).toHaveBeenNthCalledWith(
      2,
      'companies',
      expect.objectContaining({ limit: 500, offset: 500 }),
    );
    expect(result).toHaveLength(501);
    expect(result[0]).toEqual(expect.objectContaining({ id: 'crm-501', name: 'Cooperativa A' }));
  });
});
