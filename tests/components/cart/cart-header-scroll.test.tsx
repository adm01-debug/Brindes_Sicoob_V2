/**
 * Regressão: em janelas baixas a lista de orçamentos precisa rolar sem
 * empurrar o rodapé (verba + subtotal + "Gerar Orçamento") para fora da tela.
 * O `ScrollArea` aplicava `max-h-*` só no Root, que tem `overflow-hidden`:
 * o conteúdo era cortado em vez de rolar. O viewport é quem rola, por isso
 * o teto de altura precisa chegar nele (`viewportClassName`).
 *
 * Este arquivo cobre a estrutura (o teto chega ao viewport, o rodapé fica
 * fora dele e orçamento sem itens não reserva o rodapé). O comportamento em
 * navegador real — a lista rolar de fato e o CTA continuar inteiro na tela —
 * está em
 * `e2e/cart-scroll-janela-baixa.spec.ts`, porque o jsdom não calcula
 * layout.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SellerCart } from "@/hooks/useSellerCarts";

const cartItems = Array.from({ length: 5 }, (_, index) => ({
  id: `item-${index}`,
  cart_id: "cart-1",
  product_id: `product-${index}`,
  product_name: `Produto ${index}`,
  product_sku: `SKU-${index}`,
  product_image_url: null,
  product_price: 10 + index,
  quantity: 1,
  color_name: null,
  color_hex: null,
  notes: null,
  sort_order: index,
}));

const carts: SellerCart[] = Array.from({ length: 3 }, (_, index) => ({
  id: `cart-${index}`,
  seller_id: "seller-1",
  company_id: `company-${index}`,
  company_name: `Cooperativa ${index}`,
  company_location: "Cuiabá/MT",
  company_logo_url: null,
  notes: null,
  status: "active",
  created_at: "2026-11-23T10:00:00Z",
  updated_at: "2026-11-23T10:00:00Z",
  items: cartItems.map((item) => ({ ...item, cart_id: `cart-${index}` })),
}));

const cartContext = {
  carts,
  activeCart: carts[0] as SellerCart,
  activeCartId: carts[0].id,
  totalItems: 15,
  canCreateCart: true,
  setActiveCartId: vi.fn(),
  deleteCart: vi.fn(),
  removeItem: vi.fn(),
  updateItemQuantity: vi.fn(),
};

beforeEach(() => {
  cartContext.activeCart = carts[0];
});

vi.mock("@/contexts/SellerCartContext", () => ({
  useSellerCartContext: () => cartContext,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ paId: "pa-1", profile: { pa_id: "pa-1" } }),
}));

vi.mock("@/hooks/sicoob/useSicoobBudget", () => ({
  useSicoobBudget: () => ({ data: null, isLoading: false }),
}));

import { CartHeaderButton } from "@/components/cart/CartHeaderButton";

describe("ScrollArea", () => {
  it("repassa viewportClassName ao elemento que realmente rola", () => {
    render(
      <ScrollArea className="max-h-[120px]" viewportClassName="teto-do-viewport">
        <div>conteúdo</div>
      </ScrollArea>,
    );

    const viewport = document.querySelector("[data-radix-scroll-area-viewport]");
    expect(viewport).not.toBeNull();
    expect(viewport).toHaveClass("teto-do-viewport");
  });
});

describe("CartHeaderButton — janela baixa", () => {
  const panelWithFooter = "max-h-[min(calc(440px+15.5rem),var(--radix-popover-content-available-height))]";
  const panelWithoutFooter = "max-h-[min(calc(440px+4.5rem),var(--radix-popover-content-available-height))]";

  it("limita o painel e deixa a lista ceder altura para o rodapé", async () => {
    renderWithProviders(<CartHeaderButton />, { route: "/" });

    await userEvent.click(screen.getByTestId("cart-trigger"));

    // O conteúdo entra com `opacity: 0` via framer-motion; a asserção de
    // visibilidade precisa reexecutar até a animação de entrada terminar.
    const cta = await screen.findByRole("button", { name: /gerar orçamento/i });
    await waitFor(() => {
      expect(cta).toBeVisible();
    });

    // O teto fica no painel, que é uma coluna flex: crescer o rodapé (aviso de
    // alçada) reduz a lista, não corta o CTA.
    const panel = screen.getByTestId("cart-drawer");
    expect(panel).toHaveClass(panelWithFooter);
    expect(panel).toHaveClass("flex-col");
    expect(panel).toHaveClass("overflow-hidden");

    const viewport = document.querySelector("[data-radix-scroll-area-viewport]");
    expect(viewport).not.toBeNull();
    expect(viewport?.parentElement).toHaveClass("min-h-0");
    expect(viewport?.parentElement).toHaveClass("flex-1");
    // …e o rodapé com o CTA fica fora dela: nunca sai da área visível.
    expect(viewport?.contains(cta)).toBe(false);
    expect(cta.closest(".shrink-0")).not.toBeNull();

    await waitFor(() => {
      expect(screen.getAllByTestId("cart-tab")).toHaveLength(3);
    });
  });

  it("não reserva o rodapé quando o orçamento ativo está sem itens", async () => {
    cartContext.activeCart = { ...carts[0], items: [] };
    renderWithProviders(<CartHeaderButton />, { route: "/" });

    await userEvent.click(screen.getByTestId("cart-trigger"));

    await waitFor(() => {
      expect(screen.getAllByTestId("cart-tab")).toHaveLength(3);
    });
    expect(screen.queryByTestId("cart-checkout-cta")).toBeNull();

    // Sem rodapé o teto reserva só o cabeçalho; reservar o rodapé inteiro
    // deixava a lista curta demais para trocar de orçamento.
    expect(screen.getByTestId("cart-drawer")).toHaveClass(panelWithoutFooter);
  });
});
