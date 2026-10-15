import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  results: {} as Record<string, { data?: unknown; count?: number | null; error?: unknown }>,
  from: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/pages/trends/is-demo-mode", () => ({ isDemoMode: () => false }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "seller-1" } }) }));
vi.mock("@/lib/auth/apply-seller-scope", () => ({
  applySellerScope: (query: unknown) => query,
  shouldShortCircuitForSelf: () => false,
}));
vi.mock("@/lib/auth/visibility-scope", () => ({ useSalesScope: () => "all" }));

import { ConversionFunnel } from "@/components/intelligence/ConversionFunnel";
import { UnmetDemandCard } from "@/components/intelligence/UnmetDemandCard";

function createQuery(table: string) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(mocks.results[table]).then(resolve, reject),
  };
  return query;
}

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return { ...result, queryClient };
}

describe("estados de consulta da inteligência comercial", () => {
  beforeEach(() => {
    mocks.results = {
      search_analytics: { data: [], count: 0, error: null },
      product_views: { data: [], count: 0, error: null },
      quotes: { data: [], count: 0, error: null },
      orders: { data: [], count: 0, error: null },
    };
    mocks.from.mockReset().mockImplementation((table: string) => createQuery(table));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("distingue falha de consulta de demanda vazia e permite tentar novamente", async () => {
    mocks.results.search_analytics = { data: null, count: null, error: { message: "indisponível" } };
    const { queryClient } = renderWithQueryClient(<UnmetDemandCard days={30} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
    expect(screen.queryByText(/Nenhuma busca sem resultado registrada/)).not.toBeInTheDocument();

    mocks.results.search_analytics = { data: [], count: 0, error: null };
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText(/Nenhuma busca sem resultado registrada/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    queryClient.clear();
  });

  it("não converte erros de contagem em zero e permite reconsultar um funil realmente vazio", async () => {
    mocks.results.search_analytics = { data: null, count: null, error: { message: "indisponível" } };
    const { queryClient } = renderWithQueryClient(<ConversionFunnel days={30} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os dados do funil");
    expect(screen.queryByText("Buscas")).not.toBeInTheDocument();

    mocks.results.search_analytics = { data: null, count: 0, error: null };
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByText("Buscas")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(4);
    queryClient.clear();
  });
});
