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
import type { ClientVsIndustryResult } from '@/hooks/bi/useClientVsIndustry';

// Tipado pelo contrato real do hook: sem isto a fixture inventava campos
// (`industryValue`, `deltaPct`, `isAbove`) e os cartões renderizavam com
// valores indefinidos enquanto o teste do selo continuava passando.
function resultado(isMock: boolean): ClientVsIndustryResult {
  return {
    isLoading: false,
    isMock,
    hasEnoughSample: true,
    sampleSize: 7,
    daysWindow: 180,
    metrics: [
      {
        label: 'LTV', clientValue: 12000, industryAvg: 9000,
        deltaPercent: 33, classification: 'above', format: 'currency',
      },
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
    // A linha da métrica tem que sair com o número do setor e o delta, não
    // com buraco: é o que o cartão promete ao lado do selo.
    expect(screen.getByText('LTV')).toBeTruthy();
    expect(screen.getByText(/33/)).toBeTruthy();
  });
});
