import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  budgets: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { pa_id: "pa-1", approval_threshold: null }, isGestorCompras: true, isDev: false, isSupervisor: false }),
}));

import { CartApprovalThresholdNotice } from "@/components/cart/CartApprovalThresholdNotice";

function thenable(table: string) {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.then = (resolve: (value: unknown) => void) =>
    resolve({ data: table === "pa_budgets" ? mocks.budgets : [], error: null });
  return builder;
}

function renderNotice(items: Array<{ product_price: number; quantity: number }>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CartApprovalThresholdNotice items={items} />
    </QueryClientProvider>,
  );
}

describe("CartApprovalThresholdNotice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockImplementation((table: string) => thenable(table));
  });

  function freezeTime() {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-20T12:00:00.000Z"));
  }

  it("avisa que o mês do carrinho não tem alçada, sem prometer aprovação", async () => {
    freezeTime();
    mocks.budgets = [{ ano: 2026, mes: 10, limite_alcada: 1000 }];

    renderNotice([{ product_price: 300, quantity: 1 }]);

    const notice = await screen.findByTestId("cart-approval-threshold");
    expect(notice.getAttribute("data-state")).toBe("carry-over");
    expect(screen.getByText(/Alçada herdada de 10\/2026/)).toBeTruthy();
    expect(screen.getByText(/não pode ser confirmado nem enviado para aprovação/)).toBeTruthy();
    // O servidor exige alçada na competência do pedido, então o carrinho não
    // pode anunciar que o fluxo de aprovação vai aceitar o pedido.
    expect(screen.queryByText(/exigirá aprovação/)).toBeNull();
    vi.useRealTimers();
  });

  it("não avisa herança quando o mês corrente tem limite aprovado", async () => {
    freezeTime();
    mocks.budgets = [{ ano: 2026, mes: 11, limite_alcada: 1000 }];

    renderNotice([{ product_price: 300, quantity: 1 }]);

    const notice = await screen.findByTestId("cart-approval-threshold");
    expect(notice.getAttribute("data-state")).toBe("exact");
    expect(screen.getByText(/Alçada de 11\/2026/)).toBeTruthy();
    expect(screen.queryByText(/Alçada herdada/)).toBeNull();
    vi.useRealTimers();
  });

  it("bloqueia a mensagem de aprovação quando o carrinho excede a alçada", async () => {
    freezeTime();
    mocks.budgets = [{ ano: 2026, mes: 11, limite_alcada: 100 }];

    renderNotice([{ product_price: 300, quantity: 1 }]);

    expect(await screen.findByText(/Este carrinho excede a alçada/)).toBeTruthy();
    vi.useRealTimers();
  });

  it("mostra alçada de R$ 0 como limite real, e não como limite ausente", async () => {
    freezeTime();
    mocks.budgets = [{ ano: 2026, mes: 11, limite_alcada: 0 }];

    renderNotice([{ product_price: 1, quantity: 1 }]);

    const notice = await screen.findByTestId("cart-approval-threshold");
    expect(notice.getAttribute("data-state")).toBe("exact");
    expect(screen.getByText(/Alçada de 11\/2026/)).toBeTruthy();
    expect(screen.getByText(/todo pedido exige aprovação formal/)).toBeTruthy();
    vi.useRealTimers();
  });

  it("acusa o mês sem limite preenchido em vez de mostrar o valor herdado", async () => {
    freezeTime();
    mocks.budgets = [{ ano: 2026, mes: 11, limite_alcada: null }];

    renderNotice([{ product_price: 300, quantity: 1 }]);

    const notice = await screen.findByTestId("cart-approval-threshold");
    expect(notice.getAttribute("data-state")).toBe("missing");
    expect(screen.getByText(/Sem alçada para 11\/2026/)).toBeTruthy();
    expect(screen.queryByText(/Alçada herdada/)).toBeNull();
    vi.useRealTimers();
  });

  it("avisa que a verba visível é só do mês seguinte, sem se calar", async () => {
    freezeTime();
    mocks.budgets = [{ ano: 2026, mes: 12, limite_alcada: 5000 }];

    renderNotice([{ product_price: 300, quantity: 1 }]);

    const notice = await screen.findByTestId("cart-approval-threshold");
    expect(notice.getAttribute("data-state")).toBe("future-only");
    expect(screen.getByText(/Há verba cadastrada para 12\/2026/)).toBeTruthy();
    expect(screen.queryByText(/exigirá aprovação/)).toBeNull();
    vi.useRealTimers();
  });

  it("não diz que falta verba quando o mês do carrinho tem linha sem alçada", async () => {
    freezeTime();
    mocks.budgets = [
      { ano: 2026, mes: 11, limite_alcada: null },
      { ano: 2026, mes: 12, limite_alcada: 5000 },
    ];

    renderNotice([{ product_price: 300, quantity: 1 }]);

    const notice = await screen.findByTestId("cart-approval-threshold");
    expect(notice.getAttribute("data-state")).toBe("future-only");
    expect(screen.getByText(/a verba de 11\/2026 está cadastrada, mas sem alçada definida/)).toBeTruthy();
    // O painel de verbas mostra a linha de 11/2026: dizer "não para o mês do
    // carrinho" contradiz a tela do administrativo e esconde o que falta.
    expect(screen.queryByText(/mas não para o mês do carrinho/)).toBeNull();
    vi.useRealTimers();
  });

  it("não acusa alçada ausente quando nenhuma linha de verba está visível", async () => {
    freezeTime();
    mocks.budgets = [];

    renderNotice([{ product_price: 300, quantity: 1 }]);

    await waitFor(() => expect(mocks.from).toHaveBeenCalledWith("pa_budgets"));
    // A policy de SELECT esconde pa_budgets de quem não tem escopo: sem linha
    // visível a tela se cala, porque não sabe se o PA tem alçada.
    expect(screen.queryByTestId("cart-approval-threshold")).toBeNull();
    vi.useRealTimers();
  });
});
