import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../render-helpers';

const mocks = vi.hoisted(() => ({
  listQuoteDirectoryCompanies: vi.fn(),
  listQuoteDirectoryContacts: vi.fn(),
}));

vi.mock('@/lib/crm-db', () => ({
  listQuoteDirectoryCompanies: mocks.listQuoteDirectoryCompanies,
  listQuoteDirectoryContacts: mocks.listQuoteDirectoryContacts,
}));

import { CompanyContactSelector } from '@/components/quotes/CompanyContactSelector';

const company = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Cooperativa Centro',
  nome_fantasia: 'Cooperativa Centro',
  razao_social: 'Cooperativa Centro Ltda.',
  cnpj: '12345678000190',
  ramo_atividade: 'Cooperativa de crédito',
  logo_url: null,
};

describe('CompanyContactSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listQuoteDirectoryCompanies.mockResolvedValue([company]);
    mocks.listQuoteDirectoryContacts.mockResolvedValue([]);
  });

  it('inicia sem empresa e orienta a escolha do contato', () => {
    renderWithProviders(
      <CompanyContactSelector companyId="" onCompanyChange={vi.fn()} />,
    );

    expect(screen.getByLabelText('Buscar empresa por nome ou CNPJ')).toBeInTheDocument();
    expect(screen.getByText('Selecione uma empresa primeiro')).toBeInTheDocument();
  });

  it('propaga imediatamente os dados completos da empresa escolhida', async () => {
    const onCompanyChange = vi.fn();
    const onCompanyInfoChange = vi.fn();

    renderWithProviders(
      <CompanyContactSelector
        companyId=""
        onCompanyChange={onCompanyChange}
        onCompanyInfoChange={onCompanyInfoChange}
      />,
    );

    fireEvent.focus(screen.getByLabelText('Buscar empresa por nome ou CNPJ'));
    fireEvent.click(await screen.findByText('Cooperativa Centro'));

    expect(onCompanyChange).toHaveBeenCalledWith(company.id);
    expect(onCompanyInfoChange).toHaveBeenCalledWith({
      id: company.id,
      name: 'Cooperativa Centro',
      cnpj: company.cnpj,
      ramo_atividade: company.ramo_atividade,
    });
  });

  it('diferencia indisponibilidade do CRM de uma lista realmente vazia', async () => {
    mocks.listQuoteDirectoryCompanies.mockRejectedValueOnce(new Error('CRM indisponível'));

    renderWithProviders(
      <CompanyContactSelector companyId="" onCompanyChange={vi.fn()} />,
    );

    fireEvent.focus(screen.getByLabelText('Buscar empresa por nome ou CNPJ'));

    expect(await screen.findByText('Não foi possível carregar empresas')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma empresa encontrada')).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.listQuoteDirectoryCompanies).toHaveBeenCalledTimes(1));
  });

  it('mantém resultados locais e oferece retry quando a busca remota falha', async () => {
    mocks.listQuoteDirectoryCompanies.mockImplementation(
      (options?: { term?: string }) =>
        options?.term ? Promise.reject(new Error('Busca indisponível')) : Promise.resolve([company]),
    );

    renderWithProviders(<CompanyContactSelector companyId="" onCompanyChange={vi.fn()} />);
    const input = screen.getByLabelText('Buscar empresa por nome ou CNPJ');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Centro' } });

    expect(await screen.findByText('Resultados locais exibidos; a atualização falhou.')).toBeInTheDocument();
    expect(screen.getByText('Cooperativa Centro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('expõe falha de contatos com retry e mantém seleção acessível por teclado', async () => {
    mocks.listQuoteDirectoryContacts.mockRejectedValue(new Error('Contatos indisponíveis'));

    renderWithProviders(
      <CompanyContactSelector companyId={company.id} onCompanyChange={vi.fn()} />,
    );

    expect(
      await screen.findByRole('button', {
        name: `Alterar empresa selecionada: ${company.name}`,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Não foi possível carregar os contatos.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(mocks.listQuoteDirectoryContacts).toHaveBeenCalledTimes(2));
  });
});
