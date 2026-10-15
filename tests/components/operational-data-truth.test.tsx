import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  market: vi.fn(),
  products: vi.fn(),
  productMatch: vi.fn(),
  categoriesByIds: vi.fn(),
  clients: vi.fn(),
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
vi.mock('@/hooks/useCrmCompanies', () => ({ useCrmCompanies: mocks.clients, useAllCrmCompanies: mocks.clients }));
vi.mock('@/components/clients/ClientCard', () => ({
  ClientCard: ({ client }: { client: { razao_social: string } }) => <div>{client.razao_social}</div>,
}));
vi.mock('@/hooks/useCategoryIcons', () => ({
  useCategoryIcons: () => ({ data: [] }),
  getCategoryIcon: () => '📦',
}));
vi.mock('@/components/ai/AIChat', () => ({
  AIChat: ({ assistantMode, assistantContext }: { assistantMode: string; assistantContext: string }) => <div data-testid="chat-real">{assistantMode} {assistantContext}</div>,
}));

import { AIMockupAssistant } from '@/components/ai/AIMockupAssistant';
import { MarketIntelligenceChart } from '@/components/intelligence/MarketIntelligenceChart';
import { CatalogActiveFilters } from '@/components/catalog/CatalogActiveFilters';
import { defaultFilters } from '@/components/filters/FilterPanel';
import ProductMatchPage from '@/pages/ProductMatchPage';
import ClientsPage from '@/pages/ClientsPage';
import { ProductCategoryBadges } from '@/components/products/ProductCategoryBadges';
import { TooltipProvider } from '@/components/ui/tooltip';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

describe('integridade de dados nas ferramentas comerciais', () => {
  beforeEach(() => {
    mocks.market.mockReset();
    mocks.products.mockReset();
    mocks.productMatch.mockReset().mockReturnValue({ matches: [] });
    mocks.categoriesByIds.mockReset().mockReturnValue([]);
    mocks.clients.mockReset().mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() });
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

    expect(screen.getByTestId('chat-real').textContent).toContain('layout');
    expect(screen.getByTestId('chat-real').textContent).toContain('Produto: Caneca Sicoob');
    expect(screen.getByTestId('chat-real').textContent).toContain('Técnica: Laser');
    expect(screen.queryByText(/Simulate AI response/i)).toBeNull();
  });

  it('calcula os indicadores de clientes apenas com registros reais do CRM', () => {
    const now = new Date().toISOString();
    mocks.clients.mockReturnValue({
      data: [
        { id: '1', razao_social: 'Cooperativa Alpha', nome_fantasia: null, title: null, cnpj: '00.000.000/0001-00', cidade: 'Brasília', estado: 'DF', created_at: now },
        { id: '2', razao_social: 'Cooperativa Beta', nome_fantasia: null, title: null, cnpj: null, cidade: null, estado: null, created_at: '2024-01-01T00:00:00.000Z' },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<MemoryRouter><ClientsPage /></MemoryRouter>);

    expect(screen.getByText('Total Clientes').nextElementSibling?.textContent).toBe('2');
    expect(screen.getByText('Novos no mês').nextElementSibling?.textContent).toBe('1');
    expect(screen.getByText('Com localização').nextElementSibling?.textContent).toBe('1');
    expect(screen.getByText('Com CNPJ').nextElementSibling?.textContent).toBe('1');
    expect(screen.queryByText('R$ 4.2k')).toBeNull();
    expect(screen.queryByText('94%')).toBeNull();
  });

  it('oculta indicadores incompletos quando o CRM está indisponível', () => {
    mocks.clients.mockReturnValue({ data: [], isLoading: false, isError: true, refetch: vi.fn() });

    render(<MemoryRouter><ClientsPage /></MemoryRouter>);

    expect(screen.getByText('Não foi possível consultar o CRM')).toBeTruthy();
    expect(screen.queryByText('Total Clientes')).toBeNull();
  });

  it('abre o gerador de mockup com o produto pré-selecionado por URL', () => {
    render(
      <MemoryRouter initialEntries={['/produto/produto-1']}>
        <TooltipProvider>
          <Routes>
            <Route path="/produto/:id" element={<ProductCategoryBadges category={{ id: 'cat-1', name: 'Canecas' }} productId="produto / 1" />} />
            <Route path="/mockup-generator" element={<LocationProbe />} />
          </Routes>
        </TooltipProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Visualizar com Logo'));

    expect(screen.getByTestId('location').textContent).toBe('/mockup-generator?product_id=produto%20%2F%201');
  });
});
