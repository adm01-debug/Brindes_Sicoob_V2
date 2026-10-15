import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import { TrendsHeatmap } from '@/components/intelligence/TrendsHeatmap';

function heatmapWith(count: number) {
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
  matrix[1]![10] = count;
  return { matrix, max: count };
}

describe('estados centralizados do mapa de calor de tendências', () => {
  it('não trata falha sem cache como mapa vazio e permite retry', () => {
    const retry = vi.fn();
    render(<TrendsHeatmap days={30} isError onRetry={retry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(
      screen.queryByText('Sem dados suficientes para o mapa de calor'),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('mantém o snapshot em cache durante falha de atualização', () => {
    render(<TrendsHeatmap days={30} data={heatmapWith(3)} isError onRetry={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('dados anteriores continuam exibidos');
    expect(screen.getByTitle(/3 eventos$/)).toBeInTheDocument();
  });

  it('só declara ausência após receber a matriz vazia', () => {
    render(<TrendsHeatmap days={30} data={heatmapWith(0)} />);
    expect(screen.getByText('Sem dados suficientes para o mapa de calor')).toBeInTheDocument();
  });
});
