import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { TrendsForecastChart } from '@/components/intelligence/TrendsForecastChart';
import { ProductsTabContent, SearchesTabContent } from '@/pages/trends/TrendsCharts';

const toggler = vi.fn();

describe('estados das visualizações principais de tendências', () => {
  it('não converte erro inicial da série temporal em ausência de dados', () => {
    const retry = vi.fn();
    render(
      <TrendsForecastChart
        dailyTrends={undefined}
        isLoading={false}
        isError
        isFetching={false}
        onRetry={retry}
        showForecast={false}
        onToggleForecast={toggler}
        showCompare={false}
        onToggleCompare={toggler}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.queryByText('Nenhum dado disponível')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('não apresenta rankings vazios quando a consulta inicial falha', () => {
    const retry = vi.fn();
    const first = render(
      <MemoryRouter>
        <ProductsTabContent
          topProducts={undefined}
          isLoading={false}
          isError
          onRetry={retry}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('ranking de produtos');
    expect(screen.queryByText('Nenhum produto visualizado ainda')).not.toBeInTheDocument();
    first.unmount();

    render(
      <SearchesTabContent
        topSearches={undefined}
        isLoading={false}
        isError
        onRetry={retry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('ranking de buscas');
    expect(screen.queryByText('Nenhuma busca registrada ainda')).not.toBeInTheDocument();
  });

  it('mantém ações do produto visíveis quando o grupo recebe foco', () => {
    render(
      <MemoryRouter>
        <ProductsTabContent
          topProducts={[
            {
              id: 'produto-1',
              name: 'Caneca Sicoob',
              views: 12,
              compares: 2,
            },
          ]}
          isLoading={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Criar orçamento com este produto' }).parentElement)
      .toHaveClass('group-focus-within:opacity-100');
  });
});
