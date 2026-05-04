import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MiniCart } from "../MiniCart";
import { useCart } from "@/hooks/useCart";
import { useApprovalThreshold } from "@/hooks/useApprovalThreshold";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock hooks
vi.mock("@/hooks/useCart", () => ({
  useCart: vi.fn(),
}));

vi.mock("@/hooks/useApprovalThreshold", () => ({
  useApprovalThreshold: vi.fn(),
}));

const renderMiniCart = () => {
  return render(
    <BrowserRouter>
      <TooltipProvider>
        <MiniCart />
      </TooltipProvider>
    </BrowserRouter>
  );
};

describe("MiniCart Alçada UI - States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it("should show success state when EXACTLY at threshold", async () => {
    (useCart as any).mockReturnValue({
      items: [{ id: "1", product_name: "Limit Product", product_price: 1000, quantity: 1 }],
      subtotal: 1000,
      totalItemsCount: 1,
      removeItem: { mutate: vi.fn() },
      updateQuantity: { mutate: vi.fn() },
    });

    (useApprovalThreshold as any).mockReturnValue({
      threshold: 1000,
      needsApproval: () => false,
    });

    renderMiniCart();
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText(/100% do limite/i)).toBeDefined();
    });
    expect(screen.queryByText(/Limite Excedido/i)).toBeNull();
  });

  it("should show error UI for 0.01 over threshold", async () => {
    (useCart as any).mockReturnValue({
      items: [{ id: "1", product_name: "Over Product", product_price: 1000.01, quantity: 1 }],
      subtotal: 1000.01,
      totalItemsCount: 1,
      removeItem: { mutate: vi.fn() },
      updateQuantity: { mutate: vi.fn() },
    });

    (useApprovalThreshold as any).mockReturnValue({
      threshold: 1000,
      needsApproval: () => true,
    });

    renderMiniCart();
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText(/Limite Excedido/i)).toBeDefined();
    });
    expect(screen.getByText(/\+R\$ 0,01/i)).toBeDefined();
  });
});


