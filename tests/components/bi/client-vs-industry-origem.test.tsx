/**
 * O comparativo Cliente × Setor não pode carimbar "Dados reais" sobre número
 * inventado.
 *
 * Antes, `useClientBI` devolvia `isMock: true` com `MOCK_CLIENT_STATS` para
 * qualquer cliente sem pedidos, `useClientVsIndustry` montava LTV, ticket,
 * frequência e itens/orçamento a partir desses números e o componente
 * renderizava o selo "Dados reais" fixo. Agora o simulado é só do cliente de
 * demonstração, e cliente sem histórico (ou com consulta falhada) tem cartão
 * próprio, sem comparativo nenhum.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useClientVsIndustry = vi.fn();
vi.mock('@/hooks/bi/useClientVsIndustry', () => ({ useClientVsIndustry: () => useClientVsIndustry() }));

import { ClientVsIndustryComparison } from '@/components/bi/ClientVsIndustryComparison';
import type { ClientVsIndustryResult } from '@/hooks/bi/useClientVsIndustry';

// Tipado pelo contrato real do hook: sem isto a fixture inventava campos
// (`industryValue`, `deltaPct`, `isAbove`) e os cartões renderizavam com
// valores indefinidos enquanto o teste do selo continuava passando.
function resultado(
  parcial: Partial<ClientVsIndustryResult> = {},
): ClientVsIndustryResult {
  return {
    isLoading: false,
    isError: false,
    error: null,
    refetch: async () => undefined,
    isMock: false,
    hasClientData: true,
    isClientDataUnavailable: false,
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
    ...parcial,
  };
}

describe('ClientVsIndustryComparison — origem do dado', () => {
  it('cliente de demonstracao: avisa que os números são ilustrativos', () => {
    useClientVsIndustry.mockReturnValue(resultado({ isMock: true }));

    render(<ClientVsIndustryComparison clientId="c1" ramoAtividade="Cooperativa" />);

    expect(screen.getByText('Cliente de demonstração · números ilustrativos')).toBeTruthy();
    expect(screen.queryByText('Dados reais')).toBeNull();
  });

  it('cliente sem pedido: nao compara, e nao oferece repetir', () => {
    useClientVsIndustry.mockReturnValue(resultado({ hasClientData: false }));

    render(<ClientVsIndustryComparison clientId="c1" ramoAtividade="Cooperativa" />);

    expect(screen.getByRole('status').textContent).toMatch(/ainda não tem pedido no histórico/);
    expect(screen.queryByText('Dados reais')).toBeNull();
    expect(screen.queryByText('LTV')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
  });

  it('historico indisponivel: avisa a falha e oferece repetir', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    useClientVsIndustry.mockReturnValue(resultado({
      hasClientData: false, isClientDataUnavailable: true, isError: true, refetch,
    }));

    render(<ClientVsIndustryComparison clientId="c1" ramoAtividade="Cooperativa" />);

    expect(screen.getByRole('alert').textContent).toMatch(/Histórico do cliente indisponível/);
    expect(screen.queryByText('Dados reais')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('cliente com histórico: mantém o selo de dado real', () => {
    useClientVsIndustry.mockReturnValue(resultado());

    render(<ClientVsIndustryComparison clientId="c1" ramoAtividade="Cooperativa" />);

    expect(screen.getByText('Dados reais')).toBeTruthy();
    expect(screen.queryByText('Cliente sem histórico · números ilustrativos')).toBeNull();
    // A linha da métrica tem que sair com o número do setor e o delta, não
    // com buraco: é o que o cartão promete ao lado do selo.
    expect(screen.getByText('LTV')).toBeTruthy();
    expect(screen.getByText(/33/)).toBeTruthy();
  });
});
