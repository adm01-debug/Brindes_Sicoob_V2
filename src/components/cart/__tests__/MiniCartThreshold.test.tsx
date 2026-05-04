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

describe("MiniCart Alçada UI - Advanced States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it("should handle loading states gracefully", async () => {
    (useCart as any).mockReturnValue({
      items: [], subtotal: 0, totalItemsCount: 0
    });

    (useApprovalThreshold as any).mockReturnValue({
      threshold: 0,
      needsApproval: () => false,
      isLoading: true // Simulating loading
    });

    const { asFragment } = renderMiniCart();
    // Snapshot for loading state consistency
    expect(asFragment()).toMatchSnapshot();
  });

  it("should calculate correctly with multiple items", async () => {
    const mockItems = [
      { id: "1", product_name: "Item A", product_price: 400, quantity: 2 },
      { id: "2", product_name: "Item B", product_price: 300, quantity: 1 }
    ];
    // Total = 400*2 + 300 = 1100

    (useCart as any).mockReturnValue({
      items: mockItems,
      subtotal: 1100,
      totalItemsCount: 3,
      removeItem: { mutate: vi.fn() },
      updateQuantity: { mutate: vi.fn() },
    });

    (useApprovalThreshold as any).mockReturnValue({
      threshold: 1000,
      needsApproval: (val: number) => val > 1000,
    });

    renderMiniCart();
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText(/Limite Excedido/i)).toBeDefined();
      expect(screen.getByText(/\+R\$ 100,00/i)).toBeDefined();
    });
  });

  it("should show specific category alerts when threshold is hit by item", async () => {
     (useCart as any).mockReturnValue({
      items: [{ id: "1", product_name: "Premium Gift", product_price: 600, quantity: 1, category_id: 5 }],
      subtotal: 600,
      totalItemsCount: 1,
    });

    (useApprovalThreshold as any).mockReturnValue({
      threshold: 5000, // Global is high
      categoryThresholds: [{ category_id: 5, limite_alcada: 500 }], // But category 5 is low
      needsApproval: () => true, // Hook returns true because of category
    });

    renderMiniCart();
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText(/Requer aprovação da Singular/i)).toBeDefined();
    });
  });
});



