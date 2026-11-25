import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../render-helpers";

const mocks = vi.hoisted(() => ({ useExternalProductSearch: vi.fn() }));

vi.mock("@/hooks/useExternalSimulator", () => ({
  useExternalProductSearch: mocks.useExternalProductSearch,
}));

import { ProductSearch } from "@/components/pricing/simulator/ProductSearch";

describe("ProductSearch - validação do preço de venda", () => {
  it.each([
    { name: "Preço zero", sale_price: 0, expectedAvailable: false },
    { name: "Preço negativo", sale_price: -0.01, expectedAvailable: false },
    { name: "Preço não finito NaN", sale_price: Number.NaN, expectedAvailable: false },
    { name: "Preço não finito infinito", sale_price: Number.POSITIVE_INFINITY, expectedAvailable: false },
    { name: "Preço válido", sale_price: 12.5, expectedAvailable: true },
  ])("marca $name corretamente ao selecionar produto", ({ name, sale_price, expectedAvailable }) => {
    const onSelect = vi.fn();
    mocks.useExternalProductSearch.mockReturnValue({
      data: [{
        id: "produto-teste",
        name,
        sku: "TESTE-1",
        sale_price,
        images: [],
        primary_image_url: null,
        supplier_reference: null,
        brand: null,
      }],
      isLoading: false,
    });

    renderWithProviders(<ProductSearch onSelect={onSelect} selectedProduct={null} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(name) }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      name,
      price: expectedAvailable ? sale_price : 0,
      priceAvailable: expectedAvailable,
    }));
  });
});
