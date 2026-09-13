/**
 * Tests for ProductSparkline — covers the PR text label changes:
 *
 * Garante que depleção de estoque não seja apresentada como venda ou pedido.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import React from "react";

// ── Mock useSparklineData with real data so the component renders ──

const mockSparklineData = {
  totalQty: 150,
  totalReplenished: 20,
  availableStock: 300,
  dailyQty: [5, 3, 8, 10, 4, 7, 9, 6, 3, 12, 5, 8, 4, 6, 11, 9, 3, 7, 5, 10, 8, 6, 4, 9, 11, 5, 7, 3, 8, 6],
};

vi.mock("@/hooks/useSparklineSales", () => ({
  useSparklineData: vi.fn(() => mockSparklineData),
}));

describe("ProductSparkline — origem dos dados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the sparkline SVG when real data is available", async () => {
    const { ProductSparkline } = await import("@/components/products/ProductSparkline");
    renderWithProviders(<ProductSparkline productId="test-product" />);

    // SVG should be in the document
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("does NOT show old 'Vendas no fornecedor' tooltip text (renamed label)", async () => {
    const { ProductSparkline } = await import("@/components/products/ProductSparkline");
    renderWithProviders(<ProductSparkline productId="test-product" />);

    // Hover over the sparkline container to reveal the tooltip
    const container = document.querySelector(".group\\/spark");
    if (container) {
      fireEvent.mouseEnter(container);
      fireEvent.mouseMove(container, { clientX: 50, clientY: 10 });
    }

    // Old label must not appear anywhere in the DOM
    expect(screen.queryByText(/Vendas no fornecedor 30d/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Vendas no fornecedor · Dia/i)).not.toBeInTheDocument();
  });

  it("identifica as saídas de estoque na grade de métricas", async () => {
    const { ProductSparkline } = await import("@/components/products/ProductSparkline");
    renderWithProviders(<ProductSparkline productId="test-product" />);

    // Hover to trigger tooltip
    const container = document.querySelector(".group\\/spark");
    if (container) {
      fireEvent.mouseEnter(container);
      fireEvent.mouseMove(container, { clientX: 50, clientY: 10 });
    }

    // New label should be visible
    expect(screen.getByText("Saídas de estoque 30d")).toBeInTheDocument();
  });

  it("identifica a série como estoque do fornecedor", async () => {
    const { ProductSparkline } = await import("@/components/products/ProductSparkline");
    renderWithProviders(<ProductSparkline productId="test-product" />);

    const container = document.querySelector(".group\\/spark");
    if (container) {
      fireEvent.mouseEnter(container);
      fireEvent.mouseMove(container, { clientX: 50, clientY: 10 });
    }

    expect(screen.getByText(/Estoque do fornecedor · Dia \d+/i)).toBeInTheDocument();
  });

  it("explica que a métrica não representa pedidos Sicoob", async () => {
    const { ProductSparkline } = await import("@/components/products/ProductSparkline");
    renderWithProviders(<ProductSparkline productId="test-product" />);

    const container = document.querySelector(".group\\/spark");
    if (container) fireEvent.mouseEnter(container);

    expect(screen.getByText(/não representa pedidos Sicoob/i)).toBeInTheDocument();
  });

  it("hides tooltip content when mouse leaves", async () => {
    const { ProductSparkline } = await import("@/components/products/ProductSparkline");
    renderWithProviders(<ProductSparkline productId="test-product" />);

    const container = document.querySelector(".group\\/spark");
    if (container) {
      // Show tooltip
      fireEvent.mouseEnter(container);
      fireEvent.mouseMove(container, { clientX: 50, clientY: 10 });

      // Then hide
      fireEvent.mouseLeave(container);
    }

    // After mouse leaves, tooltip data should not be visible
    expect(screen.queryByText("Saídas de estoque 30d")).not.toBeInTheDocument();
  });

  it("returns null when product has no real data (no render)", async () => {
    const { useSparklineData } = await import("@/hooks/useSparklineSales");
    vi.mocked(useSparklineData).mockReturnValueOnce(null);

    const { ProductSparkline } = await import("@/components/products/ProductSparkline");
    const { container } = renderWithProviders(<ProductSparkline productId="empty-product" />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when totalQty is 0 (all-zero data treated as no data)", async () => {
    const { useSparklineData } = await import("@/hooks/useSparklineSales");
    vi.mocked(useSparklineData).mockReturnValueOnce({
      totalQty: 0,
      totalReplenished: 0,
      availableStock: 0,
      dailyQty: new Array(30).fill(0),
    });

    const { ProductSparkline } = await import("@/components/products/ProductSparkline");
    const { container } = renderWithProviders(<ProductSparkline productId="zero-product" />);
    expect(container.firstChild).toBeNull();
  });
});
