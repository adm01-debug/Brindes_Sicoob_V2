import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SizeFilter } from '@/components/filters/filter-panel/sections/SizeFilter';

describe('SizeFilter', () => {
  it('distingue falha de carregamento de um catálogo legitimamente vazio', () => {
    const onRetry = vi.fn();

    render(
      <SizeFilter
        selectedSizes={[]}
        onToggleSize={vi.fn()}
        error={new Error('bridge indisponível')}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os tamanhos disponíveis.',
    );
    expect(screen.queryByText('Nenhum tamanho disponível no catálogo.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('preserva opções em cache e informa falha de atualização', () => {
    render(
      <SizeFilter
        selectedSizes={['M']}
        onToggleSize={vi.fn()}
        availableSizes={['P', 'M']}
        error={new Error('refetch falhou')}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Exibindo tamanhos em cache');
    expect(screen.getByRole('button', { name: 'P' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
  });
});
