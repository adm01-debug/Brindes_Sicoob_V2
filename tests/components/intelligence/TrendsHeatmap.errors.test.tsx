import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  results: {} as Record<string, { data: Array<{ created_at: string }> | null; error: { message: string } | null }>,
  from: vi.fn(),
}));

vi.mock("@/lib/supabase-untyped", () => ({ untypedFrom: (table: string) => mocks.from(table) }));
vi.mock("@/pages/trends/is-demo-mode", () => ({ isDemoMode: () => false }));

import { TrendsHeatmap } from "@/components/intelligence/TrendsHeatmap";

function createQuery(table: string) {
  const query = {
    select: vi.fn(() => query),
    gte: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(mocks.results[table]).then(resolve, reject),
  };
  return query;
}

function renderHeatmap() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const view = render(<QueryClientProvider client={queryClient}><TrendsHeatmap days={30} /></QueryClientProvider>);
  return { ...view, queryClient };
}

describe("estados de erro do mapa de calor de tendências", () => {
  beforeEach(() => {
    mocks.results = {
      product_views: { data: [], error: null },
      search_analytics: { data: [], error: null },
    };
    mocks.from.mockReset().mockImplementation((table: string) => createQuery(table));
  });

  afterEach(() => vi.clearAllMocks());

  it.each(["product_views", "search_analytics"])(
    "não trata falha em %s como um heatmap realmente vazio e permite retry",
    async (table) => {
      mocks.results[table] = { data: null, error: { message: "falha técnica" } };
      const { queryClient } = renderHeatmap();

      expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
      expect(screen.queryByText("Sem dados suficientes para o mapa de calor")).not.toBeInTheDocument();

      mocks.results[table] = { data: [], error: null };
      fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

      expect(await screen.findByText("Sem dados suficientes para o mapa de calor")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      queryClient.clear();
    },
  );

  it("mantém heatmap em cache após falha de atualização, informa o usuário e recupera no retry", async () => {
    const previousView = new Date();
    previousView.setHours(10, 0, 0, 0);
    mocks.results.product_views = { data: [{ created_at: previousView.toISOString() }], error: null };
    const { queryClient } = renderHeatmap();
    const queryKey = ["trends-heatmap", 30, false];

    expect(await screen.findByTitle(/1 eventos$/)).toBeInTheDocument();

    mocks.results.search_analytics = { data: null, error: { message: "falha temporária" } };
    await queryClient.refetchQueries({ queryKey });

    expect(await screen.findByRole("alert")).toHaveTextContent("dados anteriores continuam exibidos");
    expect(screen.getByTitle(/1 eventos$/)).toBeInTheDocument();

    mocks.results.search_analytics = { data: [], error: null };
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByTitle(/1 eventos$/)).toBeInTheDocument();
    queryClient.clear();
  });
});
