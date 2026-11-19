/**
 * Catraca: o BI de produto não pode mostrar número fabricado ao vendedor.
 *
 * Regra travada aqui (vive hoje em `src/components/inventory/risk/ProductRiskDetail.tsx`
 * e em `src/hooks/useProductIntelligenceBadges.ts`):
 *  - fonte que respondeu vazia vira estado próprio "sem histórico", nunca demonstração
 *    com `generateMock*` atrás de um selo "demo";
 *  - fonte caída sem cache vira estado de erro com retry das três fontes, nunca zero,
 *    "—" silencioso ou cache apresentado como número do dia;
 *  - erro com histórico em cache mantém o número real e se declara "parcial";
 *  - enquanto a fonte carrega, nenhuma métrica é apresentada como definitiva;
 *  - sem inteligência de mercado não há classe ABC, fornecedor, giro nem nível de
 *    demanda inventados — só o que o catálogo cadastrou.
 *
 * Origem: `tests/hooks/product-intelligence-real-data.test.tsx` da PR #112 (fechada sem
 * merge). Reescrito contra a API atual da `main`: `useProductIntelligenceBadges` não
 * expõe mais `isError`/`isEmpty`/`retry`, e o estado vazio do risco virou
 * `RiskSemHistorico` ("Sem histórico de estoque" + "Atualizar").
 */
import { fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  daily: vi.fn(),
  velocity: vi.fn(),
  intelligence: vi.fn(),
}));

vi.mock('@/hooks/useStockHistory', () => ({
  useStockDailySummary: mocks.daily,
  useStockVelocity: mocks.velocity,
  useProductIntelligenceData: mocks.intelligence,
  aggregateDailySummaryByDate: (summaries: Array<Record<string, unknown>>) =>
    summaries.map((summary) => ({
      date: summary.summary_date,
      stockClose: summary.stock_close,
      depleted: summary.units_depleted,
      restocked: summary.units_restocked,
      restockDetected: false,
      costPriceClose: null,
    })),
  getActiveFlags: () => [],
}));

import { ProductRiskDetail } from '@/components/inventory/risk/ProductRiskDetail';
import { useProductIntelligenceBadges } from '@/hooks/useProductIntelligenceBadges';

function query(overrides: Record<string, unknown> = {}) {
  return { data: undefined, isLoading: false, error: null, refetch: vi.fn(), ...overrides };
}

/** Linha de histórico sempre recente: data fixa sairia da janela de 30d e viraria teste-bomba. */
function recentSummary() {
  const date = new Date();
  date.setDate(date.getDate() - 3);
  return {
    summary_date: date.toISOString().slice(0, 10),
    stock_close: 10,
    units_depleted: 2,
    units_restocked: 0,
  };
}

const REAL_VELOCITY = {
  variant_supplier_source_id: 'source-1',
  supplier_id: 'supplier-1',
  product_id: 'produto-real',
  variant_id: 'variant-1',
  current_stock: 10,
  avg_daily_depletion_7d: 2,
  days_to_stockout: 5,
  velocity_trend: 1.2,
  price_changes_30d: 0,
};

const REAL_INTELLIGENCE = {
  product_id: 'produto-real',
  supplier_count: 2,
  total_current_stock: 10,
  avg_velocity_7d: 2,
  turnover_score: 72,
  abc_classification: 'A',
  is_hot_product: false,
  is_stockout_risk: false,
  is_stagnant: false,
  is_negotiation_opportunity: false,
  has_frequent_restock: false,
};

function renderRisk() {
  return render(
    <MemoryRouter>
      <ProductRiskDetail productId="produto-real" productName="Garrafa Sicoob" />
    </MemoryRouter>,
  );
}

function kpiValue(label: string) {
  const card = screen.getByText(label).closest('[role="status"]');
  expect(card).toBeTruthy();
  return card as HTMLElement;
}

describe('inteligência de produto baseada em dados reais', () => {
  beforeEach(() => {
    mocks.daily.mockReset().mockReturnValue(query({ data: [] }));
    mocks.velocity.mockReset().mockReturnValue(query({ data: [] }));
    mocks.intelligence.mockReset().mockReturnValue(query({ data: null }));
  });

  it('fonte vazia vira "sem histórico" próprio, sem fabricar estoque, saída ou fornecedor', () => {
    renderRisk();

    expect(screen.getByText('Sem histórico de estoque')).toBeTruthy();
    expect(screen.getByText(/não há risco a calcular/)).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Métricas de risco do produto' })).toBeNull();
    expect(screen.queryByText(/demo/i)).toBeNull();
    expect(screen.queryByText(/ilustrativ/i)).toBeNull();
    expect(screen.queryByText(/^Classe /)).toBeNull();
  });

  it('estado vazio oferece atualizar e refaz as três fontes', () => {
    const refetchDaily = vi.fn();
    const refetchVelocity = vi.fn();
    const refetchIntelligence = vi.fn();
    mocks.daily.mockReturnValue(query({ data: [], refetch: refetchDaily }));
    mocks.velocity.mockReturnValue(query({ data: [], refetch: refetchVelocity }));
    mocks.intelligence.mockReturnValue(query({ data: null, refetch: refetchIntelligence }));

    renderRisk();
    fireEvent.click(screen.getByRole('button', { name: /Atualizar/ }));

    expect(refetchDaily).toHaveBeenCalledOnce();
    expect(refetchVelocity).toHaveBeenCalledOnce();
    expect(refetchIntelligence).toHaveBeenCalledOnce();
  });

  it('fonte caída sem cache vira erro com retry das três fontes, não zero nem vazio', () => {
    const refetchDaily = vi.fn();
    const refetchVelocity = vi.fn();
    const refetchIntelligence = vi.fn();
    mocks.daily.mockReturnValue(
      query({ data: [], error: new Error('indisponível'), refetch: refetchDaily }),
    );
    mocks.velocity.mockReturnValue(
      query({ data: [], error: new Error('indisponível'), refetch: refetchVelocity }),
    );
    mocks.intelligence.mockReturnValue(query({ data: null, refetch: refetchIntelligence }));

    renderRisk();

    expect(screen.getByText('Erro ao carregar dados')).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Métricas de risco do produto' })).toBeNull();
    expect(screen.queryByText('Sem histórico de estoque')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }));
    expect(refetchDaily).toHaveBeenCalledOnce();
    expect(refetchVelocity).toHaveBeenCalledOnce();
    expect(refetchIntelligence).toHaveBeenCalledOnce();
  });

  it('erro com histórico em cache mantém o número real e se declara parcial', () => {
    mocks.daily.mockReturnValue(query({ data: [recentSummary()] }));
    mocks.velocity.mockReturnValue(query({ data: [REAL_VELOCITY] }));
    mocks.intelligence.mockReturnValue(query({ data: null, error: new Error('indisponível') }));

    renderRisk();

    expect(screen.getByText('parcial')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Métricas de risco do produto' })).toBeTruthy();
    expect(within(kpiValue('Estoque atual')).getByText('10')).toBeTruthy();
  });

  it('enquanto a fonte carrega, nenhuma métrica é apresentada como definitiva', () => {
    mocks.daily.mockReturnValue(query({ data: [recentSummary()], isLoading: true }));
    mocks.velocity.mockReturnValue(query({ data: [REAL_VELOCITY] }));
    mocks.intelligence.mockReturnValue(query({ data: REAL_INTELLIGENCE }));

    renderRisk();

    expect(screen.getByRole('status', { name: 'Carregando detalhes do produto' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Métricas de risco do produto' })).toBeNull();
    expect(screen.queryByText('10')).toBeNull();
    expect(screen.queryByText('Classe A')).toBeNull();
  });

  it('com as fontes respondendo, mostra o número que veio delas e nenhum selo de demonstração', () => {
    mocks.daily.mockReturnValue(query({ data: [recentSummary()] }));
    mocks.velocity.mockReturnValue(query({ data: [REAL_VELOCITY] }));
    mocks.intelligence.mockReturnValue(query({ data: REAL_INTELLIGENCE }));

    renderRisk();

    expect(screen.getByText('Classe A')).toBeTruthy();
    expect(within(kpiValue('Estoque atual')).getByText('10')).toBeTruthy();
    expect(within(kpiValue('Estoque atual')).getByText('2 fornecedores')).toBeTruthy();
    expect(within(kpiValue('Saída/dia (7d)')).getByText('2.0')).toBeTruthy();
    expect(screen.queryByText('parcial')).toBeNull();
    expect(screen.queryByText(/demo/i)).toBeNull();
    expect(screen.queryByText(/ilustrativ/i)).toBeNull();
  });

  it('sem inteligência de mercado não inventa classe ABC nem fornecedor', () => {
    mocks.daily.mockReturnValue(query({ data: [recentSummary()] }));
    mocks.velocity.mockReturnValue(query({ data: [REAL_VELOCITY] }));
    mocks.intelligence.mockReturnValue(query({ data: null }));

    renderRisk();

    expect(screen.queryByText(/^Classe /)).toBeNull();
    expect(within(kpiValue('Estoque atual')).getByText('no fornecedor')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Indicadores de risco' })).toBeNull();
  });

  it('badges: sem métricas de mercado sobram só os indicadores cadastrais', () => {
    mocks.intelligence.mockReturnValue(query({ data: undefined }));
    mocks.velocity.mockReturnValue(query({ data: undefined }));

    const { result } = renderHook(() =>
      useProductIntelligenceBadges('produto-real', { featured: true }),
    );

    expect(result.current.badges.map((badge) => badge.type)).toEqual(['featured']);
    expect(result.current.turnoverScore).toBeNull();
    expect(result.current.demandLevel).toBeNull();
    expect(result.current).not.toHaveProperty('isDemo');
  });
});
