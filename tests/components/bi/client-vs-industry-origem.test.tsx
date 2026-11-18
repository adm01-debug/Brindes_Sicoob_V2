/**
 * O comparativo Cliente × Setor não pode carimbar "Dados reais" sobre número
 * inventado.
 *
 * useClientBI devolve isMock: true com MOCK_CLIENT_STATS quando o cliente não
 * tem pedidos; useClientVsIndustry propaga isso e monta LTV, ticket, frequência
 * e itens/orçamento a partir desses números. O componente ignorava isMock e
 * renderizava o selo "Dados reais" fixo — o vendedor via um LTV fabricado
 * comparado contra benchmark setorial verdadeiro, afirmado como medido.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useClientVsIndustry = vi.fn();
vi.mock('@/hooks/bi/useClientVsIndustry', () => ({ useClientVsIndustry: () => useClientVsIndustry() }));

import { ClientVsIndustryComparison } from '@/components/bi/ClientVsIndustryComparison';

function resultado(isMock: boolean) {
  return {
    isLoading: false,
    isMock,
    hasEnoughSample: true,
    sampleSize: 7,
    daysWindow: 180,
    metrics: [
      { label: 'LTV', clientValue: 12000, industryValue: 9000, deltaPct: 33, format: 'currency', isAbove: true },
    ],
    insight: null,
  };
}

describe('ClientVsIndustryComparison — origem do dado', () => {
  it('cliente sem histórico: avisa que os números são ilustrativos', () => {
    useClientVsIndustry.mockReturnValue(resultado(true));

    render(<ClientVsIndustryComparison clientId="c1" ramoAtividade="Cooperativa" />);

    expect(screen.getByText('Cliente sem histórico · números ilustrativos')).toBeTruthy();
    expect(screen.queryByText('Dados reais')).toBeNull();
  });

  it('cliente com histórico: mantém o selo de dado real', () => {
    useClientVsIndustry.mockReturnValue(resultado(false));

    render(<ClientVsIndustryComparison clientId="c1" ramoAtividade="Cooperativa" />);

    expect(screen.getByText('Dados reais')).toBeTruthy();
    expect(screen.queryByText('Cliente sem histórico · números ilustrativos')).toBeNull();
  });
});
