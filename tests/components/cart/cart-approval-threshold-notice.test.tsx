import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
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

  it("avisa quando a alçada vem de uma competência anterior", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-20T12:00:00.000Z"));
    mocks.budgets = [{ ano: 2026, mes: 10, limite_alcada: 1000 }];

    renderNotice([{ product_price: 300, quantity: 1 }]);

    expect(await screen.findByTestId("cart-approval-threshold")).toBeTruthy();
    expect(screen.getByText(/Alçada herdada de 10\/2026/)).toBeTruthy();
    expect(screen.getByText(/Não há limite de alçada aprovado para o mês corrente/)).toBeTruthy();
    vi.useRealTimers();
  });

  it("não avisa herança quando o mês corrente tem limite aprovado", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-20T12:00:00.000Z"));
    mocks.budgets = [{ ano: 2026, mes: 11, limite_alcada: 1000 }];

    renderNotice([{ product_price: 300, quantity: 1 }]);

    expect(await screen.findByText(/Alçada de 11\/2026/)).toBeTruthy();
    expect(screen.queryByText(/Alçada herdada/)).toBeNull();
    vi.useRealTimers();
  });

  it("bloqueia a mensagem de aprovação quando o carrinho excede a alçada", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-20T12:00:00.000Z"));
    mocks.budgets = [{ ano: 2026, mes: 11, limite_alcada: 100 }];

    renderNotice([{ product_price: 300, quantity: 1 }]);

    expect(await screen.findByText(/Este carrinho excede a alçada/)).toBeTruthy();
    vi.useRealTimers();
  });
});
