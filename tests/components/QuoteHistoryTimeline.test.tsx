import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const historyEvent = {
  id: "evento-1",
  action: "status_change",
  description: "Orçamento aprovado",
  metadata: null,
  created_at: "2026-09-24T12:00:00.000Z",
  user_id: "usuario-1",
};

const database = vi.hoisted(() => {
  const historyQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  const profilesQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  historyQuery.select = vi.fn(() => historyQuery);
  historyQuery.eq = vi.fn(() => historyQuery);
  historyQuery.order = vi.fn(() => Promise.resolve({
    data: [{
      id: "evento-1",
      action: "status_change",
      description: "Orçamento aprovado",
      metadata: null,
      created_at: "2026-09-24T12:00:00.000Z",
      user_id: "usuario-1",
    }],
    error: null,
  }));
  profilesQuery.select = vi.fn(() => profilesQuery);
  profilesQuery.in = vi.fn(() => Promise.resolve({
    data: [{ user_id: "usuario-1", full_name: "Ana Gestora" }],
    error: null,
  }));
  return {
    from: vi.fn((table: string) => table === "quote_history" ? historyQuery : profilesQuery),
    historyQuery,
    profilesQuery,
  };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: database.from } }));

import { QuoteHistoryTimeline } from "@/components/quotes/QuoteHistoryTimeline";

describe("QuoteHistoryTimeline", () => {
  beforeEach(() => {
    database.historyQuery.order.mockReset().mockResolvedValue({ data: [historyEvent], error: null });
    database.profilesQuery.in.mockReset().mockResolvedValue({
      data: [{ user_id: "usuario-1", full_name: "Ana Gestora" }],
      error: null,
    });
  });

  it("busca os nomes separadamente, sem depender de relação inexistente", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><QuoteHistoryTimeline quoteId="orcamento-1" /></QueryClientProvider>);

    expect(await screen.findByText("Orçamento aprovado")).toBeInTheDocument();
    expect(screen.getByText("Ana Gestora")).toBeInTheDocument();
    expect(database.historyQuery.select).toHaveBeenCalledWith("id, action, description, metadata, created_at, user_id");
    expect(database.profilesQuery.in).toHaveBeenCalledWith("user_id", ["usuario-1"]);
  });

  it("distingue um histórico vazio de uma falha de consulta", async () => {
    database.historyQuery.order.mockResolvedValueOnce({ data: [], error: null });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={queryClient}><QuoteHistoryTimeline quoteId="orcamento-vazio" /></QueryClientProvider>);

    expect(await screen.findByText("Nenhum evento registrado.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("exibe erro e permite tentar novamente até recuperar o histórico", async () => {
    database.historyQuery.order
      .mockRejectedValueOnce(new Error("falha interna"))
      .mockResolvedValueOnce({ data: [historyEvent], error: null });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={queryClient}><QuoteHistoryTimeline quoteId="orcamento-com-falha" /></QueryClientProvider>);

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar o histórico do orçamento.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Orçamento aprovado")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(database.historyQuery.order).toHaveBeenCalledTimes(2);
  });
});
