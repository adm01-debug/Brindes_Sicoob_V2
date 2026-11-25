import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/lib/external-db', () => ({ invokeExternalDb: mocks.invoke }));
vi.mock('@/hooks/useSupplierNames', () => ({ useSupplierNames: () => ({ data: new Map() }) }));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="market-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Bar: () => null,
  ComposedChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Legend: () => null,
}));

import { MarketIntelligenceChart } from '@/components/intelligence/MarketIntelligenceChart';

const ONTEM = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

const PAGINA = {
  records: [{
    id: 1,
    summary_date: ONTEM,
    stock_close: 80,
    units_depleted: 10,
    units_restocked: 3,
    supplier_id: 'forn-1',
  }],
  count: 1,
  meta: {},
};

function montar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MarketIntelligenceChart />
    </QueryClientProvider>,
  );
  return queryClient;
}

const avisoStale = () => screen.queryByText(/Exibindo o último gráfico disponível/);
/** O aviso precisa ser anunciado por leitor de tela, não só pintado na tela. */
const regiaoDeStatus = () =>
  screen
    .queryAllByRole('status')
    .find((el) => /Exibindo o último gráfico disponível/.test(el.textContent ?? '')) ?? null;

describe('cache de inteligência de mercado após falha de atualização', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
  });

  it('mantém o gráfico, desabilita o retry durante a busca e limpa o aviso no sucesso', async () => {
    mocks.invoke.mockResolvedValue(PAGINA);
    const queryClient = montar();
    await screen.findByTestId('market-chart');
    expect(screen.getByLabelText(/Vendas no mercado: 10\.0/)).toBeTruthy();
    expect(regiaoDeStatus()).toBeNull();
    // Nenhum aviso visível fora de região de status pode passar batido.
    expect(avisoStale()).toBeNull();

    // Atualização falha: React Query mantém os dados anteriores e expõe o erro.
    mocks.invoke.mockRejectedValue(new Error('bridge fora do ar'));
    await queryClient.refetchQueries({ queryKey: ['market-intelligence-macro'] });

    // O aviso precisa estar numa regiao `status` (anunciada) e conter o texto.
    await waitFor(() => expect(regiaoDeStatus()).not.toBeNull());
    expect(regiaoDeStatus()).toHaveTextContent(/Exibindo o último gráfico disponível/);
    expect(screen.getByTestId('market-chart')).toBeTruthy();
    expect(screen.getByLabelText(/Vendas no mercado: 10\.0/)).toBeTruthy();

    // Retentativa em voo: o botão fica bloqueado e o aviso continua visível.
    let liberar: (valor: typeof PAGINA) => void = () => {};
    mocks.invoke.mockImplementation(() => new Promise((resolve) => { liberar = resolve; }));
    const botao = screen.getByRole('button', { name: /Tentar novamente/ });
    fireEvent.click(botao);
    await waitFor(() => expect(botao).toBeDisabled());
    expect(regiaoDeStatus()).not.toBeNull();
    expect(regiaoDeStatus()).toHaveTextContent(/Exibindo o último gráfico disponível/);

    // Sucesso: dados novos entram e o aviso sai.
    liberar({
      ...PAGINA,
      records: [{ ...PAGINA.records[0], units_depleted: 14 }],
    });
    await waitFor(() => expect(regiaoDeStatus()).toBeNull());
    // O aviso precisa sumir por inteiro, não só da região anunciada.
    expect(avisoStale()).toBeNull();
    expect(screen.getByLabelText(/Vendas no mercado: 14\.0/)).toBeTruthy();
  });
});
