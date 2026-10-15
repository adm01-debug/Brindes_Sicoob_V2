import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../render-helpers";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  calculatePrice: vi.fn(),
  getTiers: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mocks.navigate };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: mocks.toastError } }));
vi.mock("@/hooks/useTecnicasUnificadas", () => ({
  useCustomizationPricing: () => ({
    isLoading: false,
    techniques: [{ code: "LASER", priceByColor: true }],
    calculatePrice: mocks.calculatePrice,
    getTiers: mocks.getTiers,
  }),
}));
vi.mock("@/components/pricing/simulator/ProductSearch", () => ({
  ProductSearch: ({ onSelect }: { onSelect: (product: unknown) => void }) => (
    <>
      <button type="button" onClick={() => onSelect({ id: "produto-1", name: "Caneta Sicoob", sku: "CAN-1", price: 25.5, images: ["https://img.test/caneta.png"] })}>Selecionar produto de teste</button>
      <button type="button" onClick={() => onSelect({ id: "produto-sem-preco", name: "Caneca sem preço", sku: "CAN-0", price: 0, priceAvailable: false, images: [] })}>Selecionar produto sem preço</button>
    </>
  ),
}));
vi.mock("@/components/pricing/calculator/TechniqueMultiSelector", () => ({
  TechniqueMultiSelector: ({ onToggleTechnique }: { onToggleTechnique: (technique: unknown, add: boolean) => void }) => (
      <button type="button" onClick={() => onToggleTechnique({ id: "vinculo-1", techniqueId: "tecnica-1", techniqueName: "Laser", techniqueCode: "LASER", locationName: "Frente", locationCode: "FRT", composedCode: "CAN-FRT-LASER" }, true)}>
      Selecionar técnica de teste
    </button>
  ),
}));
vi.mock("@/components/pricing/calculator/TechniqueConfigCard", () => ({ TechniqueConfigCard: () => <div>Configuração real</div> }));
vi.mock("@/components/pricing/calculator/QuantityComparisonTable", () => ({ QuantityComparisonTable: () => <div>Comparação calculada</div> }));

import { QuantityPriceCalculator } from "@/components/pricing/QuantityPriceCalculator";

describe("QuantityPriceCalculator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calculatePrice.mockReturnValue({ unitPrice: 2, setupPrice: 10, handlingPrice: 35 });
    mocks.getTiers.mockReturnValue([{ minQuantity: 1 }]);
  });

  it("inicia exigindo a seleção de um produto real", () => {
    renderWithProviders(<QuantityPriceCalculator />);

    expect(screen.getByText("1. Selecione o Produto")).toBeTruthy();
    expect(screen.queryByText("4. Compare Preços por Tiragem")).toBeNull();
  });

  it("envia produto, quantidade e personalização calculada ao novo orçamento", () => {
    renderWithProviders(<QuantityPriceCalculator />);
    fireEvent.click(screen.getByRole("button", { name: "Selecionar produto de teste" }));
    fireEvent.click(screen.getByRole("button", { name: "Selecionar técnica de teste" }));
    fireEvent.change(screen.getByLabelText("Quantidade para o orçamento"), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar Orçamento a partir desta Simulação" }));

    expect(mocks.calculatePrice).toHaveBeenCalledWith("LASER", 500);
    expect(mocks.navigate).toHaveBeenCalledWith("/orcamentos/novo", {
      state: {
        fromSimulator: true,
        simulationData: {
          product: {
            id: "produto-1",
            name: "Caneta Sicoob",
            sku: "CAN-1",
            imageUrl: "https://img.test/caneta.png",
            price: 25.5,
          },
          quantity: 500,
          personalizations: [{
            technique: { id: "tecnica-1", name: "Laser" },
            specs: { colors: 1, locationName: "Frente", locationCode: "FRT", composedCode: "CAN-FRT-LASER", techniqueCode: "LASER" },
            pricing: { setupPrice: 10, handlingPrice: 35, unitPrice: 2, totalPrice: 1045 },
          }],
        },
      },
    });
  });

  it("bloqueia orçamento abaixo da quantidade mínima cadastrada", () => {
    mocks.getTiers.mockReturnValue([{ minQuantity: 500 }]);
    renderWithProviders(<QuantityPriceCalculator />);
    fireEvent.click(screen.getByRole("button", { name: "Selecionar produto de teste" }));
    fireEvent.click(screen.getByRole("button", { name: "Selecionar técnica de teste" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar Orçamento a partir desta Simulação" }));

    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.getTiers).toHaveBeenCalledWith("LASER");
    expect(mocks.calculatePrice).not.toHaveBeenCalled();
  });

  it("não presume preço zero quando o produto não tem preço de venda cadastrado", () => {
    renderWithProviders(<QuantityPriceCalculator />);
    fireEvent.click(screen.getByRole("button", { name: "Selecionar produto sem preço" }));
    fireEvent.click(screen.getByRole("button", { name: "Selecionar técnica de teste" }));

    expect(screen.getAllByRole("alert")[0]?.textContent ?? "").toContain("não informou o preço de venda");
    expect(screen.getByRole("button", { name: "Criar Orçamento a partir desta Simulação" }).hasAttribute("disabled")).toBe(true);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
