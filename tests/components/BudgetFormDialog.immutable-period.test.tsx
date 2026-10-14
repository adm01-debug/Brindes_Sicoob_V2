// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BudgetFormDialog } from "@/pages/admin/AdminVerbasPage";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("BudgetFormDialog — competência imutável", () => {
  it("desabilita PA, ano e mês ao editar uma verba existente", () => {
    render(<BudgetFormDialog
      open
      onOpenChange={vi.fn()}
      onSave={vi.fn()}
      pas={[{ id: "pa-1", nome: "PA Centro", codigo: "001" }]}
      budget={{
        id: "verba-1",
        pa_id: "pa-1",
        ano: 2026,
        mes: 10,
        verba_total: 10000,
        verba_consumida: 0,
        limite_alcada: 1000,
        observacoes: null,
        created_at: "2026-10-01T00:00:00.000Z",
        updated_at: "2026-10-01T00:00:00.000Z",
        postos_atendimento: { nome: "PA Centro", codigo: "001" },
      }}
    />);

    expect((screen.getByRole("combobox") as HTMLButtonElement).disabled).toBe(true);
    const numericInputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(numericInputs).toHaveLength(4);
    expect(numericInputs[0]!.disabled).toBe(true);
    expect(numericInputs[1]!.disabled).toBe(true);
    expect(numericInputs[2]!.disabled).toBe(false);
    expect(numericInputs[3]!.disabled).toBe(false);
    expect(screen.getByText("PA e competência são imutáveis após a criação da verba.")).toBeTruthy();
  });
});
