/**
 * Regressão: o diálogo de vincular cooperativa/unidade precisa diferenciar
 * "erro ao carregar o diretório" de "nenhuma cooperativa encontrada".
 * Sem o estado de erro, uma falha (ex.: RLS negando o perfil) era exibida como
 * vazio — o usuário não via motivo nem como repetir.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../render-helpers";

vi.mock("@/contexts/SellerCartContext", () => ({
  useSellerCartContext: () => ({
    createCart: vi.fn().mockResolvedValue(true),
    canCreateCart: true,
  }),
  SellerCartProvider: ({ children }: { children: ReactNode }) => children,
}));

const fetchMock = vi.fn();

vi.mock("@/components/cart/cart-company-options", () => ({
  fetchCartCompanyOptions: (...args: unknown[]) => fetchMock(...args),
  CartCompanyOption: {} as unknown,
}));

import { CartCompanyPickerDialog } from "@/components/cart/CartCompanyPickerDialog";
import { CartCompanyPicker } from "@/components/cart/CartCompanyPicker";


describe("CartCompanyPickerDialog — erro no diretório", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    localStorage.clear();
  });

  it("mostra erro + Tentar novamente quando o fetch falha, e recupera no retry", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([
      { id: "c1", name: "Cooperativa Solar", ramo: "Crédito", logo_url: null },
    ]);

    renderWithProviders(<CartCompanyPickerDialog open onOpenChange={vi.fn()} />, { route: "/" });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/não foi possível carregar o diretório/i)
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    await waitFor(() => {
      expect(screen.getByText("Cooperativa Solar")).toBeInTheDocument();
    });
  });

  it("não inventa vazio no erro (a mensagem de vazio é exclusiva do sucesso)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("denied"));

    renderWithProviders(<CartCompanyPickerDialog open onOpenChange={vi.fn()} />, { route: "/" });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.queryByText(/nenhuma cooperativa ou unidade encontrada/i)).toBeNull();
  });

  it("picker inline: erro mostra Tentar novamente em vez de vazio", async () => {
    fetchMock.mockRejectedValueOnce(new Error("denied"));

    renderWithProviders(<CartCompanyPicker onCreated={vi.fn()} onCancel={vi.fn()} />, { route: "/" });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.queryByText(/nenhuma cooperativa ou unidade encontrada/i)).toBeNull();
  });
});
