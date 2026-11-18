/**
 * Contrato de leitura do CRM no hook compartilhado.
 *
 * É o hook de maior risco da migração: alimenta a ficha do cliente, o seletor do
 * BI e o seletor de mockup, e é usado tanto por `vendedor`/`agente` (que só
 * podem o contrato fechado) quanto por supervisão (que ainda pode o `select`
 * genérico). O que estes testes travam é a divisão entre os dois caminhos.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  fetchQuoteDirectoryCompanies,
  selectCrm,
  selectCrmById,
  searchCrm,
} from '@/lib/crm-db';
import { useCrmCompanies, useCrmCompany, useCrmCompanySelector } from '@/hooks/useCrmCompanies';
import type { QuoteDirectoryCompany } from '@/lib/crm-db';

vi.mock('@/lib/crm-db', () => ({
  fetchQuoteDirectoryCompanies: vi.fn(),
  selectCrm: vi.fn(),
  selectCrmById: vi.fn(),
  searchCrm: vi.fn(),
}));

function directoryCompany(id: string, name: string): QuoteDirectoryCompany {
  return {
    id,
    name,
    razao_social: `${name} LTDA`,
    nome_fantasia: null,
    ramo_atividade: 'Cooperativa de crédito',
    cnpj: null,
    logo_url: null,
    cidade: 'Goiânia',
    estado: 'GO',
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe('useCrmCompanies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa o contrato fechado quando o filtro é apenas is_customer', async () => {
    vi.mocked(fetchQuoteDirectoryCompanies).mockResolvedValue([directoryCompany('c-1', 'Sicoob Um')]);

    const { result } = renderHook(() => useCrmCompanies({ is_customer: true }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchQuoteDirectoryCompanies).toHaveBeenCalled();
    expect(selectCrm).not.toHaveBeenCalled();
    expect(searchCrm).not.toHaveBeenCalled();
    expect(result.current.data?.[0]).toEqual(expect.objectContaining({ id: 'c-1', cidade: 'Goiânia', estado: 'GO' }));
  });

  it('mantém o select genérico quando há filtro que o contrato não aceita', async () => {
    vi.mocked(selectCrm).mockResolvedValue([]);

    const { result } = renderHook(
      () => useCrmCompanies({ is_customer: true, cidade: 'Goiânia' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(selectCrm).toHaveBeenCalled();
    expect(fetchQuoteDirectoryCompanies).not.toHaveBeenCalled();
  });

  it('mantém o select genérico quando não há is_customer', async () => {
    vi.mocked(selectCrm).mockResolvedValue([]);

    const { result } = renderHook(() => useCrmCompanies({ is_supplier: true }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(selectCrm).toHaveBeenCalled();
    expect(fetchQuoteDirectoryCompanies).not.toHaveBeenCalled();
  });
});

describe('useCrmCompanySelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pagina em lotes de 100 e para na página incompleta', async () => {
    const paginaCheia = Array.from({ length: 100 }, (_, i) => directoryCompany(`c-${i}`, `Empresa ${i}`));
    vi.mocked(fetchQuoteDirectoryCompanies)
      .mockResolvedValueOnce(paginaCheia)
      .mockResolvedValueOnce([directoryCompany('c-100', 'Empresa 100')]);

    const { result } = renderHook(() => useCrmCompanySelector(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchQuoteDirectoryCompanies).toHaveBeenNthCalledWith(1, { term: undefined, limit: 100, offset: 0 });
    expect(fetchQuoteDirectoryCompanies).toHaveBeenNthCalledWith(2, { term: undefined, limit: 100, offset: 100 });
    expect(result.current.data).toHaveLength(101);
    expect(result.current.data?.[0]?.name).toBe('Empresa 0');
    expect(selectCrm).not.toHaveBeenCalled();
  });
});

describe('useCrmCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolve a ficha pelo contrato fechado, sem select genérico', async () => {
    vi.mocked(fetchQuoteDirectoryCompanies).mockResolvedValue([directoryCompany('c-9', 'Sicoob Nove')]);

    const { result } = renderHook(() => useCrmCompany('c-9'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchQuoteDirectoryCompanies).toHaveBeenCalledWith({ companyId: 'c-9', limit: 1 });
    expect(selectCrmById).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(expect.objectContaining({ cidade: 'Goiânia', estado: 'GO' }));
  });

  it('recua para o select por id quando a empresa está fora do contrato', async () => {
    vi.mocked(fetchQuoteDirectoryCompanies).mockResolvedValue([]);
    vi.mocked(selectCrmById).mockResolvedValue(null);

    const { result } = renderHook(() => useCrmCompany('fornecedor-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(selectCrmById).toHaveBeenCalledWith('companies', 'fornecedor-1');
  });
});
