import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../render-helpers';

const mocks = vi.hoisted(() => ({
  listQuoteDirectoryCompanies: vi.fn(),
  selectCrm: vi.fn(),
  searchCrm: vi.fn(),
}));

vi.mock('@/lib/crm-db', () => ({
  listQuoteDirectoryCompanies: mocks.listQuoteDirectoryCompanies,
  selectCrm: mocks.selectCrm,
  searchCrm: mocks.searchCrm,
}));

import { FavoritesClientPicker } from '@/components/favorites/FavoritesClientPicker';

const company = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Cooperativa Acme',
  razao_social: 'Cooperativa Acme Ltda.',
  nome_fantasia: 'Cooperativa Acme',
  ramo_atividade: 'Cooperativa de crédito',
  cnpj: '12345678000190',
  logo_url: null,
};

describe('FavoritesClientPicker via diretório autorizado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listQuoteDirectoryCompanies.mockImplementation(async (options?: { term?: string }) =>
      options?.term ? [company] : [company],
    );
  });

  it('busca e seleciona empresa pelo diretório fechado, sem consultas genéricas ao CRM', async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <FavoritesClientPicker selectedClientId={null} selectedClientName={null} onSelect={onSelect} />,
    );

    fireEvent.change(screen.getByPlaceholderText('Buscar cliente CRM (opcional)...'), {
      target: { value: 'Acme' },
    });

    await waitFor(() => expect(mocks.listQuoteDirectoryCompanies).toHaveBeenCalledWith({
      term: 'Acme',
      limit: 20,
    }));

    fireEvent.click(await screen.findByRole('button', { name: /Cooperativa Acme/ }));

    expect(onSelect).toHaveBeenCalledWith({ id: company.id, name: company.name });
    expect(mocks.listQuoteDirectoryCompanies).toHaveBeenCalledWith({ limit: 100 });
    expect(mocks.listQuoteDirectoryCompanies).toHaveBeenCalledWith({ term: 'Acme', limit: 20 });
    expect(mocks.selectCrm).not.toHaveBeenCalled();
    expect(mocks.searchCrm).not.toHaveBeenCalled();
  });
});
