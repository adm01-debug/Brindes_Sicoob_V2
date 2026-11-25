import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ market: vi.fn(), supplierNames: vi.fn() }));

vi.mock("@/hooks/useMarketIntelligenceMacro", () => ({
  useMarketIntelligenceMacro: mocks.market,
}));
vi.mock("@/hooks/useSupplierNames", () => ({
  useSupplierNames: mocks.supplierNames,
}));

import { MarketIntelligenceChart } from "@/components/intelligence/MarketIntelligenceChart";

describe("inteligencia de mercado sem dados reais", () => {
  beforeEach(() => {
    mocks.market.mockReset();
    mocks.supplierNames.mockReset();
  });

  it("mostra ausencia de movimentacoes em vez de inventar mercado", () => {
    mocks.market.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mocks.supplierNames.mockReturnValue({ data: new Map<string, string>() });

    render(<MarketIntelligenceChart />);

    expect(screen.getByText("Sem movimentações de mercado no período selecionado")).toBeTruthy();
    expect(screen.queryByText(/dados ilustrativos/i)).toBeNull();
    expect(screen.queryByText("Brasil Brindes")).toBeNull();
    expect(screen.queryByText("Master Promo")).toBeNull();
    expect(screen.queryByText("Premium Gifts")).toBeNull();
  });

  it("mostra ausencia de movimentacoes quando o periodo volta vazio", () => {
    mocks.market.mockReturnValue({
      data: {
        daily: [],
        kpis: {
          totalDepleted7d: 0,
          totalDepleted30d: 0,
          totalRestocked30d: 0,
          totalCurrentStock: 0,
          avgDailyDepletion: 0,
          supplierCount: 0,
          topDepletionDay: null,
        },
        suppliers: [],
        supplierIds: [],
      },
      isLoading: false,
      error: null,
    });
    mocks.supplierNames.mockReturnValue({ data: new Map<string, string>() });

    render(<MarketIntelligenceChart />);

    expect(screen.getByText("Sem movimentações de mercado no período selecionado")).toBeTruthy();
  });

  it("mantem o seletor de periodo no estado vazio para procurar registros anteriores", () => {
    mocks.market.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mocks.supplierNames.mockReturnValue({ data: new Map<string, string>() });
    mocks.market.mockClear();

    render(<MarketIntelligenceChart />);

    expect(screen.getByText("360d")).toBeTruthy();
    expect(screen.getByText("Amplie o período para procurar registros anteriores.")).toBeTruthy();
  });

  it("recupera os registros ao ampliar do periodo vazio para 360 dias", async () => {
    mocks.market.mockImplementation((dias: number) =>
      dias >= 360
        ? {
            data: {
              daily: [{ date: "2026-01-02", depleted: 40, restocked: 5, stockClose: 120 }],
              kpis: {
                totalDepleted7d: 120,
                totalDepleted30d: 400,
                totalRestocked30d: 60,
                totalCurrentStock: 900,
                avgDailyDepletion: 13.3,
                supplierCount: 0,
                topDepletionDay: null,
              },
              suppliers: [],
              supplierIds: [],
            },
            isLoading: false,
            error: null,
          }
        : { data: undefined, isLoading: false, error: null },
    );
    mocks.supplierNames.mockReturnValue({ data: new Map<string, string>() });

    render(<MarketIntelligenceChart />);
    expect(screen.getByText("Sem movimentações de mercado no período selecionado")).toBeTruthy();

    // Radix Tabs ativa no mouseDown (o click nao muda o valor sozinho).
    fireEvent.mouseDown(screen.getByRole("tab", { name: "360d" }));

    await waitFor(() => expect(mocks.market.mock.calls.at(-1)?.[0]).toBe(360));
    await waitFor(() => expect(screen.queryByText("Sem movimentações de mercado no período selecionado")).toBeNull());
    expect(screen.getByRole("group", { name: "Métricas de inteligência de mercado" })).toBeTruthy();
  });
  it("avisa quando a janela excede o teto de leitura do painel", () => {
    const completo = {
      daily: [{ date: "2026-01-02", depleted: 40, restocked: 5, stockClose: 120 }],
      kpis: {
        totalDepleted7d: 120,
        totalDepleted30d: 400,
        totalRestocked30d: 60,
        totalCurrentStock: 900,
        avgDailyDepletion: 13.3,
        supplierCount: 1,
        topDepletionDay: null,
      },
      suppliers: [],
      supplierIds: ["fornecedor-1"],
    };
    mocks.supplierNames.mockReturnValue({ data: new Map<string, string>() });

    mocks.market.mockReturnValue({ data: { ...completo, truncated: true }, isLoading: false, error: null });
    const truncado = render(<MarketIntelligenceChart />);
    const aviso = screen.getByText(/Resultados parciais/).textContent ?? "";
    expect(aviso).toContain("podem estar incompletos");
    // O aviso nao pode atribuir a causa a um limite de registros: pagina degradada
    // (timeout) e sonda que falhou tambem chegam aqui sem exceder o teto.
    expect(aviso).not.toMatch(/mais registros|limite de leitura|60 mil/);
    truncado.unmount();

    mocks.market.mockReturnValue({ data: { ...completo, truncated: false }, isLoading: false, error: null });
    render(<MarketIntelligenceChart />);
    expect(screen.queryByText(/Resultados parciais/)).toBeNull();
  });
});
