/**
 * Regressão: o diálogo de vincular cooperativa/unidade precisa diferenciar
 * "erro ao carregar o diretório" de "nenhuma cooperativa encontrada".
 * Sem o estado de erro, uma falha (ex.: RLS negando o perfil) era exibida como
 * vazio — o usuário não via motivo nem como repetir.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
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


// `fetchMock` é estado de módulo: sem reset antes de cada teste a fila de
// `...Once` de um vaza para o próximo e o resultado passa a depender da ordem.
beforeEach(() => {
  fetchMock.mockReset();
  // `mockReset` deixa o mock sem implementação: uma chamada que não ache um
  // `...Once` na fila resolveria `undefined` e zeraria a lista já carregada.
  // Qualquer chamada extra representa o diretório fora do ar, como em produção.
  fetchMock.mockImplementation(() => Promise.reject(new Error("network")));
  localStorage.clear();
});

// A CI roda a suíte inteira com cobertura (608 arquivos em paralelo) e o
// commit de cada re-render chega bem depois dos ~100ms de uma execução
// isolada — em 24/11 este arquivo reprovou com o `waitFor` padrão de 1s em
// "busca sem resultado com cache" (teste de 1172ms). O teto maior vale só
// para este arquivo: o estado esperado continua asserido explicitamente.
// Ele só tem efeito porque o teto por teste deste arquivo também sobe: com os
// 5s padrão do Vitest a última espera herdaria o tempo que sobrou.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20000 });

describe("CartCompanyPickerDialog — erro no diretório", () => {
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

describe("CartCompanyPickerDialog — cache com falha", () => {
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
    await queryClient.invalidateQueries({ queryKey: ["cart-sicoob-company-options"] });
    fetchMock.mockRejectedValueOnce(new Error("network"));
    rerender(<CartCompanyPickerDialog open onOpenChange={vi.fn()} />);

    // Cache preservado + aviso discreto; alerta e vazio não substituem a lista.
    await waitFor(() => expect(screen.getByText("Cooperativa Solar")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/mostrando dados salvos/i)).toBeInTheDocument());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/nenhuma cooperativa ou unidade encontrada/i)).toBeNull();
  });

  it("retry com cache remove o aviso de dados salvos e atualiza a lista", async () => {
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

    // Fecha, invalida (simula stale) e reabre com falha de rede: cache permanece + aviso.
    rerender(<CartCompanyPickerDialog open={false} onOpenChange={vi.fn()} />);
    await queryClient.invalidateQueries({ queryKey: ["cart-sicoob-company-options"] });
    fetchMock.mockRejectedValueOnce(new Error("network"));
    rerender(<CartCompanyPickerDialog open onOpenChange={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/mostrando dados salvos/i)).toBeInTheDocument());
    expect(screen.getByText("Cooperativa Solar")).toBeInTheDocument();

    // Retry com sucesso: remove o aviso e atualiza a lista com o dado novo.
    fetchMock.mockResolvedValueOnce([
      { id: "c1", name: "Cooperativa Solar", ramo: "Crédito", logo_url: null },
      { id: "c2", name: "Cooperativa Aurora", ramo: "Crédito", logo_url: null },
    ]);
    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    await waitFor(() => expect(screen.getByText("Cooperativa Aurora")).toBeInTheDocument());
    expect(screen.queryByText(/mostrando dados salvos/i)).toBeNull();
    expect(screen.getByText("Cooperativa Solar")).toBeInTheDocument();
  });

  it("busca sem resultado com cache distingue a lista salva (não diz 'não encontrada' no diretório)", async () => {
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

    rerender(<CartCompanyPickerDialog open={false} onOpenChange={vi.fn()} />);
    await queryClient.invalidateQueries({ queryKey: ["cart-sicoob-company-options"] });
    fetchMock.mockRejectedValueOnce(new Error("network"));
    rerender(<CartCompanyPickerDialog open onOpenChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/mostrando dados salvos/i)).toBeInTheDocument());

    // Busca por termo sem correspondência na lista salva.
    const busca = screen.getByPlaceholderText(/nome, cnpj ou segmento/i);
    // `fireEvent.change` no lugar de `userEvent.type`: o valor final do campo
    // passa a ser asserido em vez de digitado tecla a tecla, então o filtro não
    // depende de quantos re-renders cabem entre as teclas sob carga. Reprovar
    // aqui volta a significar "o estado vazio não renderizou", não relógio.
    fireEvent.change(busca, { target: { value: "zzz-inexistente" } });
    expect(busca).toHaveValue("zzz-inexistente");

    await waitFor(() => {
      expect(screen.getByText(/nenhuma cooperativa na lista salva/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/nenhuma cooperativa ou unidade encontrada/i)).toBeNull();
  });
});

