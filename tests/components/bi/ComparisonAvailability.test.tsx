import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  row: vi.fn(),
  comparison: vi.fn(),
}));

vi.mock('@/hooks/bi/useClientsComparison', () => ({ useSingleClientComparisonRow: mocks.row }));
vi.mock('@/hooks/bi/useClientVsIndustry', () => ({ useClientVsIndustry: mocks.comparison }));

import { ClientComparator } from '@/components/bi/ClientComparator';
import { ClientVsIndustryComparison } from '@/components/bi/ClientVsIndustryComparison';

describe('estados de indisponibilidade em comparativos de BI', () => {
  beforeEach(() => {
    mocks.row.mockReset().mockReturnValue({
      clientId: 'cliente-1', clientName: 'Cooperativa Alpha', ramoAtividade: 'Cooperativa',
      isLoading: false, isUnavailable: true, score: 84, tier: 'healthy', ltv: 12_000, avgTicket: 2_000,
      ordersCount: 6, daysSinceLastOrder: 12, topCategory: 'Canecas',
      favoriteCategoryLabel: 'Canecas', favoriteCategorySharePct: 55,
      opportunityCategoryLabel: 'Mochilas', opportunityCategorySharePct: 24,
      nextPeakLabel: '30d', daysToNextPeak: 30, shareOfWalletPct: 42,
    });
    mocks.comparison.mockReset();
  });

  it('oculta todas as métricas do cliente quando o histórico do comparador falha', () => {
    render(<ClientComparator clientIds={['cliente-1']} onRemove={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent(/Histórico indisponível/);
    expect(screen.getByText('Score').previousElementSibling).toHaveTextContent('—');
    expect(screen.queryByText('R$ 12.000')).toBeNull();
    expect(screen.queryByText('R$ 2.000')).toBeNull();
    expect(screen.queryByText('Canecas')).toBeNull();
    expect(screen.queryByText('Mochilas')).toBeNull();
    expect(screen.queryByText('42%')).toBeNull();
  });

  it('mostra erro consultável com retry antes de classificar a amostra como insuficiente', () => {
    const refetch = vi.fn();
    mocks.comparison.mockReturnValue({
      isLoading: false, isError: true, refetch, isMock: false,
      hasClientData: true, isClientDataUnavailable: false,
      hasEnoughSample: false, sampleSize: 0, daysWindow: 180, metrics: [], insight: null,
    });

    render(<ClientVsIndustryComparison clientId="cliente-1" ramoAtividade="Cooperativa" />);

    expect(screen.getByText('Comparativo indisponível')).toBeTruthy();
    expect(screen.queryByText(/Amostra do ramo/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('preserva métricas em cache e oferece retry quando o refetch falha', () => {
    const refetch = vi.fn();
    mocks.comparison.mockReturnValue({
      isLoading: false, isError: true, refetch, isMock: false,
      hasClientData: true, isClientDataUnavailable: false,
      hasEnoughSample: true, sampleSize: 5, daysWindow: 180,
      metrics: [{ label: 'LTV', clientValue: 12000, industryAvg: 8000, deltaPercent: 50, classification: 'above', format: 'currency' }],
      insight: null,
    });

    render(<ClientVsIndustryComparison clientId="cliente-1" ramoAtividade="Cooperativa" />);

    expect(screen.getByRole('status')).toHaveTextContent(/último comparativo disponível/i);
    expect(screen.getByText(/Último cache · atualização falhou/)).toBeTruthy();
    expect(screen.getByText((_, element) => element?.textContent?.replace(/\s/g, '') === 'R$12.000')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
