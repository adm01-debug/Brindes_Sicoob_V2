import { render, screen } from "@testing-library/react";
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

describe("MiniCart Alçada UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show progress bar and 'Restam' text when under threshold", () => {
    (useCart as any).mockReturnValue({
      items: [{ id: "1", product_name: "Test", product_price: 100, quantity: 1 }],
      subtotal: 100,
      totalItemsCount: 1,
      removeItem: { mutate: vi.fn() },
      updateQuantity: { mutate: vi.fn() },
    });

    (useApprovalThreshold as any).mockReturnValue({
      threshold: 1000,
      needsApproval: () => false,
    });

    renderMiniCart();
    
    // Open the sheet (MiniCart is a trigger)
    const trigger = screen.getByRole("button");
    trigger.click();

    expect(screen.getByText(/Limite de Alçada/i)).toBeDefined();
    expect(screen.getByText(/Restam R\$ 900,00/i)).toBeDefined();
    expect(screen.queryByText(/Requer aprovação da Singular/i)).toBeNull();
  });

  it("should show error alert when over threshold", () => {
    (useCart as any).mockReturnValue({
      items: [{ id: "1", product_name: "Test", product_price: 1500, quantity: 1 }],
      subtotal: 1500,
      totalItemsCount: 1,
      removeItem: { mutate: vi.fn() },
      updateQuantity: { mutate: vi.fn() },
    });

    (useApprovalThreshold as any).mockReturnValue({
      threshold: 1000,
      needsApproval: () => true,
    });

    renderMiniCart();
    
    const trigger = screen.getByRole("button");
    trigger.click();

    expect(screen.getByText(/Limite Excedido/i)).toBeDefined();
    expect(screen.getByText(/\+R\$ 500,00/i)).toBeDefined();
    expect(screen.getByText(/Requer aprovação da Singular/i)).toBeDefined();
  });
});
