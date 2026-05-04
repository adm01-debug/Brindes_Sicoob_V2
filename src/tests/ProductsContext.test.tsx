import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { ProductsProvider, useProductsContext } from "../contexts/ProductsContext";
import { fetchPromobrindProducts } from "@/lib/external-db";

// Mock the API
vi.mock("@/lib/external-db", () => ({
  fetchPromobrindProducts: vi.fn(),
  getProductImageUrl: vi.fn((p) => p.image_url || `https://image.com/${p.sku}.jpg`),
  getProductPrice: vi.fn((p) => p.price || 0),
  getProductStock: vi.fn((p) => p.stock || 0),
}));

// Helper component to test context
const TestComponent = ({ productId }: { productId?: string }) => {
  const { products, isLoading, getProductById, registerProducts } = useProductsContext();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "idle"}</div>
      <div data-testid="count">{products.length}</div>
      {productId && (
        <div data-testid="product-name">
          {getProductById(productId)?.name || "not found"}
        </div>
      )}
      <button onClick={() => registerProducts([{ id: 'reg-1', name: 'Registered' } as any])}>
        Register
      </button>
    </div>
  );
};

describe("ProductsContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should provide empty state initially", () => {
    render(
      <ProductsProvider>
        <TestComponent />
      </ProductsProvider>
    );

    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("loading").textContent).toBe("idle");
  });

  it("should register products manually", async () => {
    render(
      <ProductsProvider>
        <TestComponent />
      </ProductsProvider>
    );

    await act(async () => {
      screen.getByText("Register").click();
    });

    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("should fetch products on demand (lazy loading)", async () => {
    const mockProduct = { id: "p1", name: "Product 1", sku: "SKU1", price: 10 };
    (fetchPromobrindProducts as any).mockResolvedValue([mockProduct]);

    render(
      <ProductsProvider>
        <TestComponent productId="p1" />
      </ProductsProvider>
    );

    // Initial state: not found, but it should trigger a fetch
    expect(screen.getByTestId("product-name").textContent).toBe("not found");

    // No need to advance timers manually if using real timers
    // but we might need to wait for the batch window (50ms) + fetch time
    await new Promise(resolve => setTimeout(resolve, 100));

    await waitFor(() => {
      expect(fetchPromobrindProducts).toHaveBeenCalledWith(expect.objectContaining({
        filters: { id: ["p1"] }
      }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("product-name").textContent).toBe("Product 1");
    });
  });

  it("should batch multiple requests into one fetch", async () => {
    const mockProducts = [
      { id: "p1", name: "P1" },
      { id: "p2", name: "P2" }
    ];
    (fetchPromobrindProducts as any).mockResolvedValue(mockProducts);

    const BatchTest = () => {
      const { getProductById } = useProductsContext();
      // Trigger two calls
      React.useEffect(() => {
        getProductById("p1");
        getProductById("p2");
      }, [getProductById]);
      return null;
    };

    render(
      <ProductsProvider>
        <BatchTest />
      </ProductsProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    await waitFor(() => {
      expect(fetchPromobrindProducts).toHaveBeenCalledTimes(1);
      const callArgs = (fetchPromobrindProducts as any).mock.calls[0][0];
      expect(callArgs.filters.id).toContain("p1");
      expect(callArgs.filters.id).toContain("p2");
    });
  });
});
