import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const historyQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  const profilesQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  historyQuery.select = vi.fn(() => historyQuery);
  historyQuery.in = vi.fn(() => historyQuery);
  historyQuery.order = vi.fn(() => Promise.resolve({
    data: [{
      id: "evento-1",
      quote_id: "orcamento-1",
      action: "status_changed",
      description: "Status alterado de pendente para aprovado",
      old_value: "pending_singular_approval",
      new_value: "approved_singular",
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

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: database.from },
}));

import { QuoteConsolidationPanel } from "@/components/quotes/QuoteConsolidationPanel";

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <QuoteConsolidationPanel
        quotes={[{
          id: "orcamento-1",
          quote_number: "Q-100",
          status: "pending_singular_approval",
          subtotal: 100,
          discount_percent: 0,
          discount_amount: 0,
          total: 100,
          items: [{ product_id: "produto-1", product_name: "Caneta", quantity: 10, unit_price: 10 }],
        }]}
      />
    </QueryClientProvider>,
  );
}

describe("QuoteConsolidationPanel — eventos registrados", () => {
  it("consulta e apresenta somente o evento persistido no histórico", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /eventos registrados/i }));

    expect(await screen.findByText("Status alterado de pendente para aprovado")).toBeInTheDocument();
    expect(screen.getByText("Ana Gestora")).toBeInTheDocument();
    expect(screen.getByText("pending_singular_approval")).toBeInTheDocument();
    expect(screen.getByText("approved_singular")).toBeInTheDocument();
    expect(database.from).toHaveBeenCalledWith("quote_history");
    expect(database.historyQuery.in).toHaveBeenCalledWith("quote_id", ["orcamento-1"]);
    expect(database.from).toHaveBeenCalledWith("profiles");
    expect(database.profilesQuery.in).toHaveBeenCalledWith("user_id", ["usuario-1"]);
    expect(screen.queryByText(/Alteração de quantidade no item/i)).not.toBeInTheDocument();
  });
});
