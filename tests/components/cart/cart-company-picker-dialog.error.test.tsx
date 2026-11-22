/**
 * Regressão: o diálogo de vincular cooperativa/unidade precisa diferenciar
 * "erro ao carregar o diretório" de "nenhuma cooperativa encontrada".
 * Sem o estado de erro, uma falha (ex.: RLS negando o perfil) era exibida como
 * vazio — o usuário não via motivo nem como repetir.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../render-helpers";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";

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

  it("picker inline: retry recupera e lista aparece", async () => {
    fetchMock.mockRejectedValueOnce(new Error("denied")).mockResolvedValueOnce([
      { id: "c1", name: "Cooperativa Aurora", ramo: "Crédito", logo_url: null },
    ]);

    renderWithProviders(<CartCompanyPicker onCreated={vi.fn()} onCancel={vi.fn()} />, { route: "/" });

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    await waitFor(() => expect(screen.getByText("Cooperativa Aurora")).toBeInTheDocument());
  });
});
  it("mantém lista em cache + aviso discreto quando a atualização falha (não esconde cooperativas)", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/"]}>
              <TooltipProvider>{children}</TooltipProvider>
            </MemoryRouter>
          </QueryClientProvider>
        </HelmetProvider>
      );
    }

    fetchMock.mockResolvedValueOnce([
      { id: "c1", name: "Cooperativa Solar", ramo: "Crédito", logo_url: null },
    ]);

    const { rerender } = render(
      <CartCompanyPickerDialog open onOpenChange={vi.fn()} />,
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(screen.getByText("Cooperativa Solar")).toBeInTheDocument());

    // Fecha o diálogo (desabilita a query), invalida (força stale — simula tempo passado)
    // e reabre com falha de rede: o refetch falha, mas o cache permanece.
    rerender(<CartCompanyPickerDialog open={false} onOpenChange={vi.fn()} />);
    queryClient.invalidateQueries({ queryKey: ["cart-sicoob-company-options"] });
    fetchMock.mockRejectedValueOnce(new Error("network"));
    rerender(<CartCompanyPickerDialog open onOpenChange={vi.fn()} />);

    // Cache preservado + aviso discreto; alerta e vazio não substituem a lista.
    await waitFor(() => expect(screen.getByText("Cooperativa Solar")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/mostrando dados salvos/i)).toBeInTheDocument());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/nenhuma cooperativa ou unidade encontrada/i)).toBeNull();
  });
