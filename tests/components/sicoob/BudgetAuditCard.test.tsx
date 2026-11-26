import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import { BudgetAuditCard } from "@/components/sicoob/BudgetAuditCard";

const { listBudgetAudit, getLatestBudgetAuditPeriod } = vi.hoisted(() => ({
  listBudgetAudit: vi.fn(),
  getLatestBudgetAuditPeriod: vi.fn(),
}));

vi.mock("@/services/sicoob/budgetService", () => ({
  sicoobBudgetService: { listBudgetAudit, getLatestBudgetAuditPeriod },
  currentBudgetPeriod: () => ({ year: 2026, month: 10 }),
}));

function row(overrides: Record<string, unknown> = {}) {
  return {
    pa_id: "pa-1",
    pa_nome: "PA TESTE 01",
    ano: 2026,
    mes: 10,
    verba_total: 10000,
    verba_registrada: 4000,
    verba_calculada_pedidos: 4000,
    discrepancia: 0,
    ...overrides,
  };
}

describe("BudgetAuditCard", () => {
  beforeEach(() => {
    listBudgetAudit.mockReset();
    getLatestBudgetAuditPeriod.mockReset();
    getLatestBudgetAuditPeriod.mockResolvedValue({ year: 2026, month: 10 });
  });

  it("abre na competência mais recente com verba registrada", async () => {
    getLatestBudgetAuditPeriod.mockResolvedValue({ year: 2026, month: 9 });
    listBudgetAudit.mockResolvedValue([row({ mes: 9 })]);
    renderWithProviders(<BudgetAuditCard />);
    await waitFor(() =>
      expect(listBudgetAudit).toHaveBeenCalledWith({ year: 2026, month: 9 }),
    );
    expect(await screen.findByDisplayValue("2026-09")).toBeInTheDocument();
  });

  it("mostra a verba registrada e o calculado pelos pedidos", async () => {
    listBudgetAudit.mockResolvedValue([row()]);
    renderWithProviders(<BudgetAuditCard />);
    expect(await screen.findByText("PA TESTE 01")).toBeInTheDocument();
    expect(screen.getByText("10/2026")).toBeInTheDocument();
    expect(screen.getByText("Registrada")).toBeInTheDocument();
    expect(screen.getByText("Calculado nos pedidos")).toBeInTheDocument();
  });

  it("destaca o PA com divergência em vez de marcar como conciliado", async () => {
    listBudgetAudit.mockResolvedValue([row({ verba_calculada_pedidos: 4500, discrepancia: 500 })]);
    renderWithProviders(<BudgetAuditCard />);
    expect(
      await screen.findByText(/1 PA\(s\) com divergência entre verba registrada e pedidos confirmados/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Conciliado")).not.toBeInTheDocument();
  });

  it("marca como conciliado quando a discrepância é zero", async () => {
    listBudgetAudit.mockResolvedValue([row()]);
    renderWithProviders(<BudgetAuditCard />);
    expect(await screen.findByText("Conciliado")).toBeInTheDocument();
    expect(screen.queryByText(/com divergência entre verba registrada/)).not.toBeInTheDocument();
  });

  it("avisa quando não há verba registrada na competência", async () => {
    listBudgetAudit.mockResolvedValue([]);
    renderWithProviders(<BudgetAuditCard />);
    expect(
      await screen.findByText("Sem verba registrada nesta competência"),
    ).toBeInTheDocument();
  });

  it("mostra o erro real quando a consulta falha", async () => {
    listBudgetAudit.mockRejectedValue(new Error("permission denied for view sicoob_budget_audit"));
    renderWithProviders(<BudgetAuditCard />);
    expect(await screen.findByText("Não foi possível carregar a conciliação")).toBeInTheDocument();
    expect(screen.getByText("permission denied for view sicoob_budget_audit")).toBeInTheDocument();
  });
});
