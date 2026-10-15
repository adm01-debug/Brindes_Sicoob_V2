import { describe, expect, it } from "vitest";
import { mapSimulatorPersonalization } from "@/hooks/quote/useQuoteInitialization";

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
      pricing: { setupPrice: 12, unitPrice: 0.5, totalPrice: 62 },
    })).toMatchObject({
      technique_id: "technique-id",
      technique_name: "Laser",
      notes: "Local: Frente (FRT) · Código: CAN-FRT-LASER",
    });
  });

  it("preserva as notas fornecidas pelo simulador ao acrescentar os metadados", () => {
    expect(mapSimulatorPersonalization({
      specs: { locationName: "Lateral", techniqueCode: "TAMPO" },
      notes: "Aplicar em branco",
    }).notes).toBe("Aplicar em branco · Local: Lateral · Código: TAMPO");
  });
});
