import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  market: vi.fn(),
  products: vi.fn(),
  productMatch: vi.fn(),
  categoriesByIds: vi.fn(),
}));

vi.mock('@/hooks/useMarketIntelligenceMacro', () => ({
  useMarketIntelligenceMacro: mocks.market,
}));
vi.mock('@/hooks/useSupplierNames', () => ({
  useSupplierNames: () => ({ data: new Map<string, string>() }),
}));
vi.mock('@/hooks/useProducts', () => ({
  useProducts: mocks.products,
}));
vi.mock('@/hooks/useProductMatch', () => ({
  useProductMatch: mocks.productMatch,
}));
vi.mock('@/hooks/useExternalCategoriesQuery', () => ({
  useCategoriesByIds: mocks.categoriesByIds,
}));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/ai/AIChat', () => ({
  AIChat: ({ systemPrompt }: { systemPrompt: string }) => <div data-testid="chat-real">{systemPrompt}</div>,
}));

import { AIMockupAssistant } from '@/components/ai/AIMockupAssistant';
import { MarketIntelligenceChart } from '@/components/intelligence/MarketIntelligenceChart';
import { CatalogActiveFilters } from '@/components/catalog/CatalogActiveFilters';
import { defaultFilters } from '@/components/filters/FilterPanel';
import ProductMatchPage from '@/pages/ProductMatchPage';

describe('integridade de dados nas ferramentas comerciais', () => {
  beforeEach(() => {
    mocks.market.mockReset();
    mocks.products.mockReset();
    mocks.productMatch.mockReset().mockReturnValue({ matches: [] });
    mocks.categoriesByIds.mockReset().mockReturnValue([]);
  });

  it('mostra ausência de movimentações sem gerar inteligência de mercado fictícia', () => {
    mocks.market.mockReturnValue({ data: undefined, isLoading: false, error: null });

    render(<MarketIntelligenceChart />);

    expect(screen.getByText('Sem movimentações de mercado no período')).toBeTruthy();
    expect(screen.queryByText(/dados ilustrativos/i)).toBeNull();
    expect(screen.queryByText('Brasil Brindes')).toBeNull();
  });

  it('mantém o Match vazio quando o catálogo oficial não possui produtos', () => {
    mocks.products.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<MemoryRouter><ProductMatchPage /></MemoryRouter>);

    expect(screen.getByText('Nenhum produto disponível')).toBeTruthy();
    expect(screen.queryByText('Caneta Personalizada Premium')).toBeNull();
    expect(mocks.productMatch).toHaveBeenCalledWith(null, [], expect.any(Object));
  });

  it('expõe falha do catálogo sem substituir a resposta por produtos fictícios', () => {
    mocks.products.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

    render(<MemoryRouter><ProductMatchPage /></MemoryRouter>);

    expect(screen.getByText('Catálogo indisponível')).toBeTruthy();
    expect(screen.getByText(/não exibimos produtos fictícios/i)).toBeTruthy();
  });

  it('nomeia filtros ativos com a categoria real do catálogo', () => {
    mocks.categoriesByIds.mockReturnValue([{ id: 'categoria-real', name: 'Sustentabilidade' }]);

    render(
      <CatalogActiveFilters
        filters={{ ...defaultFilters, categories: ['categoria-real'] }}
        setFilters={vi.fn()}
        activeFiltersCount={1}
      />,
    );

    expect(screen.getByText(/Sustentabilidade/)).toBeTruthy();
    expect(screen.queryByText(/BRINDES SICOOB/)).toBeNull();
  });

  it('liga o assistente de mockup à IA real do portal', () => {
    render(<AIMockupAssistant productName="Caneca Sicoob" techniqueName="Laser" />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir assistente de layouts' }));

    expect(screen.getByTestId('chat-real').textContent).toContain('Produto selecionado: Caneca Sicoob');
    expect(screen.getByTestId('chat-real').textContent).toContain('Técnica selecionada: Laser');
    expect(screen.queryByText(/Simulate AI response/i)).toBeNull();
  });
});
