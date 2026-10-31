import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const historyQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  const profilesQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  let historyError: Error | null = null;
  let profilesError: Error | null = null;
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
    error: historyError,
  }));
  profilesQuery.select = vi.fn(() => profilesQuery);
  profilesQuery.in = vi.fn(() => Promise.resolve({
    data: [{ user_id: "usuario-1", full_name: "Ana Gestora" }],
    error: profilesError,
  }));
  return {
    from: vi.fn((table: string) => table === "quote_history" ? historyQuery : profilesQuery),
    historyQuery,
    profilesQuery,
    setHistoryError: (error: Error | null) => { historyError = error; },
    setProfilesError: (error: Error | null) => { profilesError = error; },
  };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: database.from } }));

import { QuoteHistoryTimeline } from "@/components/quotes/QuoteHistoryTimeline";

describe("QuoteHistoryTimeline", () => {
  it("busca os nomes separadamente, sem depender de relação inexistente", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><QuoteHistoryTimeline quoteId="orcamento-1" /></QueryClientProvider>);

    expect(await screen.findByText("Orçamento aprovado")).toBeInTheDocument();
    expect(screen.getByText("Ana Gestora")).toBeInTheDocument();
    expect(database.historyQuery.select).toHaveBeenCalledWith("id, action, description, metadata, created_at, user_id");
    expect(database.profilesQuery.in).toHaveBeenCalledWith("user_id", ["usuario-1"]);
  });

  it("distingue falha de consulta de uma resposta vazia e permite tentar novamente", async () => {
    const user = userEvent.setup();
    database.setHistoryError(new Error("falha transitória"));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><QuoteHistoryTimeline quoteId="orcamento-com-falha" /></QueryClientProvider>);

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar o histórico");
    expect(screen.queryByText("Nenhum evento registrado.")).not.toBeInTheDocument();
    database.setHistoryError(null);
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Orçamento aprovado")).toBeInTheDocument();
    database.setProfilesError(null);
  });

  it("apresenta falha ao carregar nomes de perfis em vez de esconder o erro", async () => {
    database.setHistoryError(null);
    database.setProfilesError(new Error("falha de perfis"));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><QuoteHistoryTimeline quoteId="orcamento-perfis" /></QueryClientProvider>);

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar o histórico");
    database.setProfilesError(null);
  });
});
