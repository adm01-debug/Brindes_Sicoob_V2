/**
 * A rota `/orcamentos/:id/visualizar` (proposta completa: PDF, link público e
 * versões) existia registrada e sem nenhum caminho na interface: o vendedor não
 * chegava nela pelo fluxo normal.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn() } }));
vi.mock("@/components/quotes/QuoteOrderBadge", () => ({ QuoteOrderBadge: () => <span data-testid="order-badge" /> }));
vi.mock("@/components/quotes/QuoteConvertToOrder", () => ({ QuoteConvertToOrder: () => null }));

import { QuoteDetailHeader } from "@/pages/QuoteDetailPage";

const quote = {
  id: "q-1",
  quote_number: "ORC-2026-0001",
  status: "sent",
  client_name: "Cliente Teste",
  total: 100,
} as never;

describe("QuoteDetailHeader", () => {
  it("leva da página de detalhe para a proposta completa", () => {
    render(
      <MemoryRouter>
        <QuoteDetailHeader quote={quote} onConverted={() => {}} />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /Ver proposta/ });
    expect(link.getAttribute("href")).toBe("/orcamentos/q-1/visualizar");
  });
});
