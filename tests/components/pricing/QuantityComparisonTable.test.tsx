import { renderWithProviders } from "../render-helpers";
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ calculatePrice: vi.fn(), getTiers: vi.fn() }));

vi.mock("@/hooks/useTecnicasUnificadas", () => ({
  useCustomizationPricing: () => ({ calculatePrice: mocks.calculatePrice, getTiers: mocks.getTiers }),
}));

import { QuantityComparisonTable } from "@/components/pricing/calculator/QuantityComparisonTable";
import type { CalcProduct, SelectedTechniqueConfig } from "@/components/pricing/calculator/types";

const product: CalcProduct = {
  id: "product-1", name: "Caneca", sku: "CAN-1", price: 25.5, images: [], category_name: null,
};

function technique(id: string, code: string, name: string, colors = 1, sizeOption = "standard"): SelectedTechniqueConfig {
  return {
    technique: {
      id,
      techniqueId: `tech-${id}`,
      techniqueName: name,
      techniqueCode: code,
      componentName: "Caneca",
      locationName: "Frente",
      locationCode: "FRT",
      composedCode: `${code}-FRT`,
      maxWidth: null,
      maxHeight: null,
      maxArea: null,
      maxColors: null,
      isDefault: false,
    },
    colors,
    sizeOption,
    sizeModifier: 1,
  };
}

describe("QuantityComparisonTable: total combinado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTiers.mockReturnValue([{ minQuantity: 1 }]);
    mocks.calculatePrice.mockImplementation((code: string) => code === "LASER"
      ? { unitPrice: 2, setupPrice: 10, handlingPrice: 35 }
      : { unitPrice: 1.2, setupPrice: 20, handlingPrice: 15 });
  });

  it("soma o produto uma vez e inclui personalização, setup e manuseio de cada técnica", () => {
    renderWithProviders(<QuantityComparisonTable
      product={product}
      selectedConfigs={[technique("laser", "LASER", "Laser"), technique("silk", "SILK", "Silk")]} 
      quantities={[100]}
    />);

    const combinedCell = screen.getByTestId("combined-techniques-total");
    expect(combinedCell.textContent).toContain("R$ 29,50/un");
    expect(combinedCell.textContent).toContain("Total: R$ 2.950,00");
    expect(mocks.calculatePrice).toHaveBeenCalledWith("LASER", 100);
    expect(mocks.calculatePrice).toHaveBeenCalledWith("SILK", 100);
  });

  it("não apresenta total combinado parcial se uma técnica não tiver configuração de preço suportada", () => {
    renderWithProviders(<QuantityComparisonTable
      product={product}
      selectedConfigs={[technique("laser", "LASER", "Laser"), technique("silk", "SILK", "Silk", 2)]}
      quantities={[100]}
    />);

    expect(within(screen.getByTestId("combined-techniques-total")).getByText("N/D")).toBeTruthy();
    expect(mocks.calculatePrice).not.toHaveBeenCalledWith("SILK", 100);
  });
});
