import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { HotSearchesCard } from '@/components/intelligence/HotSearchesCard';
import { TopCategoriesCard } from '@/components/intelligence/TopCategoriesCard';

const hotSearches = [{ term: 'caneca', searchCount: 12, previousCount: 6, delta: 100 }];
const categories = [
  {
    category: 'Caneca',
    views: 12,
    recentViews: 8,
    baselineViews: 4,
    trendingScore: 2,
    classification: 'rising' as const,
    growthPercent: 100,
  },
];

describe('cartões de sinais de mercado — estado centralizado', () => {
  it('mostra indisponibilidade e aciona o retry central sem declarar ausência', () => {
    const retry = vi.fn();
    const first = render(
      <MemoryRouter>
        <HotSearchesCard days={30} totalSearches={0} isError onRetry={retry} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as buscas quentes',
    );
    expect(screen.queryByText('Sem dados de busca no período')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
    first.unmount();

    render(<TopCategoriesCard days={30} isError onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar o ranking');
    expect(screen.queryByText(/Ainda não há dados suficientes/)).not.toBeInTheDocument();
  });

  it('preserva o snapshot anterior durante uma falha de atualização', () => {
    const first = render(
      <MemoryRouter>
        <HotSearchesCard
          days={30}
          data={hotSearches}
          totalSearches={42}
          isError
          onRetry={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('dados anteriores continuam exibidos');
    expect(screen.getByText('"caneca"')).toBeInTheDocument();
    expect(screen.getByText('42 buscas')).toBeInTheDocument();
    first.unmount();

    render(<TopCategoriesCard days={30} data={categories} isError onRetry={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('dados anteriores continuam exibidos');
    expect(screen.getByText('Caneca')).toBeInTheDocument();
  });

  it('só declara ausência depois de receber um snapshot vazio', () => {
    const first = render(
      <MemoryRouter>
        <HotSearchesCard days={30} data={[]} totalSearches={0} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Sem dados de busca no período')).toBeInTheDocument();
    first.unmount();

    render(<TopCategoriesCard days={30} data={[]} />);
    expect(screen.getByText(/Ainda não há dados suficientes/)).toHaveTextContent(
      'ranquear famílias de produtos',
    );
  });
});
