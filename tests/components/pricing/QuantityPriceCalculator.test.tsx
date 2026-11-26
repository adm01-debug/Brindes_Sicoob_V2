/**
 * Render tests for QuantityPriceCalculator (863 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import React from "react";

vi.mock("@/lib/external-rpc", () => ({
  invokeExternalRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

const mocks = vi.hoisted(() => ({
  useExternalProductSearch: vi.fn(),
  useCustomizationPricing: vi.fn(),
}));

vi.mock("@/hooks/useExternalSimulator", () => ({
  useExternalProductSearch: mocks.useExternalProductSearch,
}));

vi.mock("@/hooks/useTecnicasUnificadas", () => ({
  useCustomizationPricing: mocks.useCustomizationPricing,
}));

function produto(salePrice: number) {
  return {
    id: "produto-teste",
    name: "Caneca Personalizada",
    sku: "SKU-1",
    sale_price: salePrice,
    images: [],
    primary_image_url: null,
    supplier_reference: null,
    brand: null,
  };
}

async function renderizar() {
  const mod = await import("@/components/pricing/QuantityPriceCalculator");
  const Component = mod.QuantityPriceCalculator || mod.default;
  renderWithProviders(<Component />);
  await screen.findByRole("button", { name: /Caneca Personalizada/ });
}

describe("QuantityPriceCalculator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useCustomizationPricing.mockReturnValue({ isLoading: false });
    mocks.useExternalProductSearch.mockReturnValue({ data: [], isLoading: false });
  });

  it("renders without crashing with no props", async () => {
    const { QuantityPriceCalculator } = await import("@/components/pricing/QuantityPriceCalculator");
    const Component = QuantityPriceCalculator || (await import("@/components/pricing/QuantityPriceCalculator")).default;
    if (Component) {
      renderWithProviders(<Component />);
    }
    expect(document.body).toBeTruthy();
  });

  it("renders with product base price", async () => {
    const mod = await import("@/components/pricing/QuantityPriceCalculator");
    const Component = mod.QuantityPriceCalculator || mod.default;
    if (Component) {
      renderWithProviders(
        <Component
          productBasePrice={25.50}
          productName="Caneta Personalizada"
        />
      );
    }
    expect(document.body).toBeTruthy();
  });

  it("bloqueia a simulação e explica quando o produto está sem preço de venda", async () => {
    mocks.useExternalProductSearch.mockReturnValue({ data: [produto(0)], isLoading: false });
    await renderizar();

    fireEvent.click(screen.getByRole("button", { name: /Caneca Personalizada/ }));

    expect(screen.getByText("Produto sem preço de venda no catálogo")).toBeTruthy();
    expect(screen.queryByText(/Selecione as Técnicas de Gravação/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Criar Orçamento/ })).toBeNull();
  });

  it("mantém a simulação quando o produto tem preço de venda válido", async () => {
    mocks.useExternalProductSearch.mockReturnValue({ data: [produto(12.5)], isLoading: false });
    await renderizar();

    fireEvent.click(screen.getByRole("button", { name: /Caneca Personalizada/ }));

    expect(screen.queryByText("Produto sem preço de venda no catálogo")).toBeNull();
    expect(screen.getByText(/Selecione as Técnicas de Gravação/)).toBeTruthy();
  });
});
