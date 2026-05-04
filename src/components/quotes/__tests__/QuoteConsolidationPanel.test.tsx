import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuoteConsolidationPanel } from "../QuoteConsolidationPanel";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockQuotes = [
  {
    id: "1",
    quote_number: "Q-001",
    client_name: "Client A",
    status: "pending_singular_approval" as const,
    subtotal: 100,
    discount_percent: 0,
    discount_amount: 0,
    total: 100,
    items: [
      { id: "i1", product_name: "Product X", product_sku: "SKU-X", quantity: 1, unit_price: 100 }
    ]
  }
];

const renderPanel = () => {
  return render(
    <BrowserRouter>
      <TooltipProvider>
        <QuoteConsolidationPanel quotes={mockQuotes} />
      </TooltipProvider>
    </BrowserRouter>
  );
};

describe("QuoteConsolidationPanel - Persistence & Reset", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should persist and restore filter preferences after reload", async () => {
    const { unmount } = renderPanel();
    
    const searchInput = screen.getByPlaceholderText(/Filtrar por Produto ou SKU/i);
    fireEvent.change(searchInput, { target: { value: "SKU-X" } });
    
    // Verify it's in localStorage
    expect(localStorage.getItem('quote_consolidation_search')).toBe("SKU-X");

    // Simulate "reload" by unmounting and remounting
    unmount();
    renderPanel();

    const restoredInput = screen.getByPlaceholderText(/Filtrar por Produto ou SKU/i) as HTMLInputElement;
    expect(restoredInput.value).toBe("SKU-X");
  });

  it("should reset filters when clicking the reset button", async () => {
    renderPanel();
    
    const searchInput = screen.getByPlaceholderText(/Filtrar por Produto ou SKU/i);
    fireEvent.change(searchInput, { target: { value: "SKU-X" } });
    
    const resetButton = screen.getByTitle(/Redefinir filtros/i);
    fireEvent.click(resetButton);

    const resetInput = screen.getByPlaceholderText(/Filtrar por Produto ou SKU/i) as HTMLInputElement;
    expect(resetInput.value).toBe("");
    expect(localStorage.getItem('quote_consolidation_search')).toBe("");
  });
});
