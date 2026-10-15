import { describe, expect, it } from "vitest";
import { mapSimulatorPersonalization } from "@/hooks/quote/useQuoteInitialization";
import { calculateItemPersonalizationCost } from "@/utils/quote-calculations";
import type { QuoteItem } from "@/hooks/quotes/quoteTypes";

describe("mapSimulatorPersonalization", () => {
  it("persiste local e código da gravação no campo de notas suportado pelo orçamento", () => {
    expect(mapSimulatorPersonalization({
      technique: { id: "technique-id", name: "Laser" },
      specs: {
        colors: 1,
        locationName: "Frente",
        locationCode: "FRT",
        composedCode: "CAN-FRT-LASER",
        techniqueCode: "LASER",
      },
      pricing: { setupPrice: 12, handlingPrice: 35, unitPrice: 0.5, totalPrice: 97 },
    })).toMatchObject({
      technique_id: "technique-id",
      technique_name: "Laser",
      setup_cost: 47,
      unit_cost: 0.5,
      total_cost: 97,
      notes: "Local: Frente (FRT) · Código: CAN-FRT-LASER",
    });
  });

  it("inclui manuseio no custo total fixo consumido pelo cálculo do orçamento", () => {
    const personalization = mapSimulatorPersonalization({
      technique: { id: "laser", name: "Laser" },
      pricing: { setupPrice: 12, handlingPrice: 35, unitPrice: 0.5, totalPrice: 97 },
    });

    const item: QuoteItem = {
      product_id: "produto",
      product_name: "Caneta",
      quantity: 100,
      unit_price: 1,
      personalizations: [personalization],
    };

    expect(calculateItemPersonalizationCost(item)).toBe(97);
  });

  it("preserva as notas fornecidas pelo simulador ao acrescentar os metadados", () => {
    expect(mapSimulatorPersonalization({
      specs: { locationName: "Lateral", techniqueCode: "TAMPO" },
      notes: "Aplicar em branco",
    }).notes).toBe("Aplicar em branco · Local: Lateral · Código: TAMPO");
  });
});
