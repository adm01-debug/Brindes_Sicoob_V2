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
    website: null,
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

  it('mantém o select genérico quando o filtro booleano é explicitamente false', async () => {
    // O contrato fechado não aplica exclusão de fornecedor/transportadora: se
    // `is_supplier: false` caísse no diretório, a lista voltaria com clientes
    // que também são fornecedores.
    vi.mocked(selectCrm).mockResolvedValue([]);

    const { result } = renderHook(
      () => useCrmCompanies({ is_customer: true, is_supplier: false }),
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

  it('entrega a empresa inteira para quem pode o select genérico, sem recorrer ao diretório', async () => {
    // A ficha do cliente lê campos fora de QUOTE_COMPANY_SELECT — `website` é o
    // que o ClientDetailHeader usa para oferecer o link do site. Resolver pelo
    // diretório primeiro tirava esse campo até de supervisor e admin.
    vi.mocked(selectCrmById).mockResolvedValue({
      id: 'c-9',
      razao_social: 'Sicoob Nove LTDA',
      website: 'https://sicoobnove.com.br',
    } as never);

    const { result } = renderHook(() => useCrmCompany('c-9'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(selectCrmById).toHaveBeenCalledWith('companies', 'c-9');
    expect(fetchQuoteDirectoryCompanies).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(
      expect.objectContaining({ website: 'https://sicoobnove.com.br' }),
    );
  });

  it('recua para o contrato fechado quando o select genérico é negado', async () => {
    vi.mocked(selectCrmById).mockRejectedValue(
      new Error('CRM DB error: Permissão insuficiente para esta operação no CRM'),
    );
    vi.mocked(fetchQuoteDirectoryCompanies).mockResolvedValue([directoryCompany('c-9', 'Sicoob Nove')]);

    const { result } = renderHook(() => useCrmCompany('c-9'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchQuoteDirectoryCompanies).toHaveBeenCalledWith({ companyId: 'c-9', limit: 1 });
    expect(result.current.data).toEqual(
      expect.objectContaining({ id: 'c-9', cidade: 'Goiânia', estado: 'GO' }),
    );
  });

  it('devolve nulo quando a empresa não existe em nenhum dos dois caminhos', async () => {
    vi.mocked(selectCrmById).mockResolvedValue(null);
    vi.mocked(fetchQuoteDirectoryCompanies).mockResolvedValue([]);

    const { result } = renderHook(() => useCrmCompany('fornecedor-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(selectCrmById).toHaveBeenCalledWith('companies', 'fornecedor-1');
    expect(result.current.data).toBeNull();
  });
});
