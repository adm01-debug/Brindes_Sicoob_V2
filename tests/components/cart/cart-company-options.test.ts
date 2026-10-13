import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { selectCrm } from '@/lib/crm-db';
import { fetchCartCompanyOptions } from '@/components/cart/cart-company-options';
import type { CrmCompany } from '@/types/crm';

vi.mock('@/lib/crm-db', () => ({
  selectCrm: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

function canonicalQuery(data: unknown[] = [], error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data, error }),
    })),
  };
}

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
    vi.mocked(supabase.from)
      .mockReturnValueOnce(canonicalQuery() as never)
      .mockReturnValueOnce(canonicalQuery() as never);
  });

  it('prioriza cooperativas e PAs do banco operacional canônico', async () => {
    vi.mocked(supabase.from)
      .mockReset()
      .mockReturnValueOnce(canonicalQuery([{
        id: 'coop-1',
        nome: 'Sicoob Central',
        codigo: '0001',
        cidade: 'Brasília',
        uf: 'DF',
      }]) as never)
      .mockReturnValueOnce(canonicalQuery([{
        id: 'pa-1',
        nome: 'PA Centro',
        codigo: '001',
        cidade: 'Brasília',
        uf: 'DF',
      }]) as never);

    const result = await fetchCartCompanyOptions();

    expect(result).toEqual([
      expect.objectContaining({ id: 'pa-1', name: 'PA Centro', ramo: 'PA 001 • Brasília/DF' }),
      expect.objectContaining({ id: 'coop-1', name: 'Sicoob Central', ramo: 'Cooperativa 0001 • Brasília/DF' }),
    ]);
    expect(selectCrm).not.toHaveBeenCalled();
  });

  it('usa o CRM legado quando o cadastro canônico está vazio e percorre todas as páginas', async () => {
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
