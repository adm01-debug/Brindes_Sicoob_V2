import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  fetchIndustryPeerIds: vi.fn(),
  rpc: vi.fn(),
  refetch: vi.fn(),
  options: null as null | Record<string, unknown>,
  queryResult: {} as Record<string, unknown>,
}));

vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.useQuery }));
// A main lê os pares pelo contrato fechado (`fetchIndustryPeerIds`), não pelo
// `selectCrm` genérico — este é negado para vendedor e agente pela política do
// portal. O que o teste cobra é o mesmo: erro do CRM tem de propagar, e setor
// vazio de verdade não pode ser confundido com falha.
vi.mock('@/lib/crm-db', () => ({ fetchIndustryPeerIds: mocks.fetchIndustryPeerIds }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/hooks/bi/useClientBI', () => ({ useClientBI: () => ({ avgTicket: 500 }) }));
vi.mock('@/hooks/bi/useClientAffinity', () => ({
  useClientAffinity: () => ({ isLoading: false, isError: false, data: { topProducts: [] }, refetch: vi.fn() }),
}));
vi.mock('@/hooks/bi/useClientCategoryAffinity', () => ({
  useClientCategoryAffinity: () => ({ categories: [] }),
}));
vi.mock('@/hooks/bi/useIndustryCategoryTrends', () => ({
  useIndustryCategoryTrends: () => ({ categories: [] }),
}));

import { ClientLookalikes } from '@/components/bi/ClientLookalikes';

describe('ClientLookalikes — disponibilidade da amostra setorial', () => {
  beforeEach(() => {
    mocks.options = null;
    mocks.refetch.mockReset().mockResolvedValue(undefined);
    mocks.fetchIndustryPeerIds.mockReset().mockResolvedValue(['empresa-2']);
    mocks.rpc.mockReset().mockResolvedValue({ data: [], error: null });
    mocks.queryResult = {
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    };
    mocks.useQuery.mockReset().mockImplementation((options: Record<string, unknown>) => {
      mocks.options = options;
      return mocks.queryResult;
    });
  });

  it('rejeita CRM e RPC indisponíveis, mas preserva setor legitimamente vazio', async () => {
    render(<ClientLookalikes clientId="cliente-1" ramoAtividade="Crédito" />);
    const queryFn = mocks.options?.queryFn as (() => Promise<unknown>) | undefined;

    mocks.fetchIndustryPeerIds.mockRejectedValueOnce(new Error('CRM indisponível'));
    await expect(queryFn?.()).rejects.toThrow('CRM indisponível');

    mocks.fetchIndustryPeerIds.mockResolvedValueOnce([]);
    await expect(queryFn?.()).resolves.toEqual({ products: [], lookalikeCount: 0 });

    mocks.fetchIndustryPeerIds.mockResolvedValueOnce(['empresa-2']);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC indisponível' } });
    await expect(queryFn?.()).rejects.toMatchObject({ message: 'RPC indisponível' });
  });

  it('não exibe cache antigo após falha e oferece retry', () => {
    mocks.queryResult = {
      data: {
        products: [{ product_id: 'produto-1', product_name: 'Produto em cache' }],
        lookalikeCount: 4,
      },
      isLoading: false,
      isError: true,
      refetch: mocks.refetch,
    };

    render(<ClientLookalikes clientId="cliente-1" ramoAtividade="Crédito" />);

    expect(screen.getByRole('alert')).toHaveTextContent(/clientes semelhantes do setor/i);
    expect(screen.queryByText('Produto em cache')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
});
