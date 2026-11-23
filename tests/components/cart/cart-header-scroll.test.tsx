/**
 * Regressão: em janelas baixas a lista de orçamentos precisa rolar sem
 * empurrar o rodapé (verba + subtotal + "Gerar Orçamento") para fora da tela.
 * O `ScrollArea` aplicava `max-h-*` só no Root, que tem `overflow-hidden`:
 * o conteúdo era cortado em vez de rolar. O viewport é quem rola, por isso
 * o teto de altura precisa chegar nele (`viewportClassName`).
 *
 * Este arquivo cobre a estrutura (o teto chega ao viewport e o rodapé fica
 * fora dele). O comportamento em navegador real — a lista rolar de fato e o
 * CTA continuar inteiro na tela — está em
 * `e2e/flows/24-cart-scroll-janela-baixa.spec.ts`, porque o jsdom não calcula
 * layout.
 */
import { describe, it, expect, vi } from "vitest";
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

vi.mock("@/contexts/SellerCartContext", () => ({
  useSellerCartContext: () => ({
    carts,
    activeCart: carts[0],
    activeCartId: carts[0].id,
    totalItems: 15,
    canCreateCart: true,
    setActiveCartId: vi.fn(),
    deleteCart: vi.fn(),
    removeItem: vi.fn(),
    updateItemQuantity: vi.fn(),
  }),
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
  it("mantém o CTA fora da área rolável e limita a altura do viewport", async () => {
    renderWithProviders(<CartHeaderButton />, { route: "/" });

    await userEvent.click(screen.getByTestId("cart-trigger"));

    // O conteúdo entra com `opacity: 0` via framer-motion; a asserção de
    // visibilidade precisa reexecutar até a animação de entrada terminar.
    const cta = await screen.findByRole("button", { name: /gerar orçamento/i });
    await waitFor(() => {
      expect(cta).toBeVisible();
    });

    const viewport = document.querySelector("[data-radix-scroll-area-viewport]");
    expect(viewport).not.toBeNull();
    // A lista longa rola dentro do teto de altura…
    expect(viewport).toHaveClass("max-h-[min(440px,calc(100dvh-17rem))]");
    // …e o rodapé com o CTA fica fora dela: nunca sai da área visível.
    expect(viewport?.contains(cta)).toBe(false);

    await waitFor(() => {
      expect(screen.getAllByTestId("cart-tab")).toHaveLength(3);
    });
  });
});
