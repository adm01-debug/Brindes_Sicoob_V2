import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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
      expect(screen.getByText(/Excesso:/i)).toBeDefined();
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

  it("should update approval state when quantities change", async () => {
    const updateQuantity = vi.fn();
    (useCart as any).mockReturnValue({
      items: [{ id: "1", product_name: "Adjustable Item", product_price: 600, quantity: 1 }],
      subtotal: 600,
      totalItemsCount: 1,
      updateQuantity: { mutate: updateQuantity },
      removeItem: { mutate: vi.fn() },
    });

    (useApprovalThreshold as any).mockReturnValue({
      threshold: 1000,
      needsApproval: (total: number) => total > 1000,
    });

    const { rerender } = renderMiniCart();
    fireEvent.click(screen.getByRole("button"));

    // Initial state: Under limit
    await waitFor(() => {
      expect(screen.getByText(/Limite de Alçada/i)).toBeDefined();
    });

    // Simulate clicking plus button (using a more robust selector)
    const plusButtons = screen.getAllByRole("button");
    const plusButton = plusButtons.find(b => b.innerHTML.includes('lucide-plus'));
    if (plusButton) fireEvent.click(plusButton);
    
    expect(updateQuantity).toHaveBeenCalled();

    // Rerender with new totals (1200 > 1000)
    (useCart as any).mockReturnValue({
      items: [{ id: "1", product_name: "Adjustable Item", product_price: 600, quantity: 2 }],
      subtotal: 1200,
      totalItemsCount: 2,
      updateQuantity: { mutate: updateQuantity },
      removeItem: { mutate: vi.fn() },
    });

    (useApprovalThreshold as any).mockReturnValue({
      threshold: 1000,
      needsApproval: (total: number) => total > 1000,
    });

    rerender(
      <BrowserRouter>
        <TooltipProvider>
          <MiniCart />
        </TooltipProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Limite Excedido/i)).toBeDefined();
    });
  });

  it("should have accessible alerts and indicators", async () => {
    (useCart as any).mockReturnValue({
      items: [{ id: "1", product_name: "A11y Test", product_price: 1500, quantity: 1 }],
      subtotal: 1500,
      totalItemsCount: 1,
    });

    (useApprovalThreshold as any).mockReturnValue({
      threshold: 1000,
      needsApproval: () => true,
    });

    renderMiniCart();
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(/Requer aprovação da Singular/i);
      
      const region = screen.getByRole("region", { name: /Informações de Alçada e Aprovação/i });
      expect(region).toBeDefined();

      const progress = screen.getByLabelText(/Progresso do limite de alçada/i);
      expect(progress).toBeDefined();
    });
  });

  it("should reset the cart when reset button is clicked", async () => {
    const clearCart = vi.fn();
    // Mock window.confirm to always return true
    vi.stubGlobal('confirm', vi.fn(() => true));

    (useCart as any).mockReturnValue({
      items: [{ id: "1", product_name: "Item to clear", product_price: 100, quantity: 1 }],
      subtotal: 100,
      totalItemsCount: 1,
      clearCart: { mutate: clearCart }
    });

    (useApprovalThreshold as any).mockReturnValue({
      threshold: 1000,
      needsApproval: () => false,
    });

    renderMiniCart();
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      const resetBtn = screen.getByTitle(/Redefinir carrinho/i);
      fireEvent.click(resetBtn);
      expect(clearCart).toHaveBeenCalled();
    });
  });
});



