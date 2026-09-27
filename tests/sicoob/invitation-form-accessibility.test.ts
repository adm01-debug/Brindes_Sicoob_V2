import { describe, expect, it } from "vitest";
import { firstInvitationError, validateInvitationForm } from "@/lib/sicoob/invitationForm";

describe("validação acessível do convite institucional", () => {
  it("associa mensagens específicas e prioriza o primeiro campo inválido", () => {
    const errors = validateInvitationForm({
      email: "email-invalido",
      cooperativeId: "",
      role: "gerente_pa",
      paId: "",
      expiresInHours: "0",
      requiresPa: true,
    });

    expect(errors).toEqual({
      email: "Informe um email institucional válido.",
      cooperative: "Selecione a cooperativa.",
      pa: "Selecione o posto de atendimento.",
      expiry: "Informe uma validade inteira entre 1 e 168 horas.",
    });
    expect(firstInvitationError(errors)).toBe("email");
  });

  it("aceita limites inteiros e não exige PA para papel sem escopo de agência", () => {
    expect(validateInvitationForm({
      email: "compras@sicoob.com.br",
      cooperativeId: "cooperativa-1",
      role: "vendedor",
      paId: "",
      expiresInHours: "168",
      requiresPa: false,
    })).toEqual({});
  });

  it.each(["1.5", "169", "", "NaN"])("rejeita validade fora do contrato: %s", (expiresInHours) => {
    const errors = validateInvitationForm({
      email: "compras@sicoob.com.br",
      cooperativeId: "cooperativa-1",
      role: "vendedor",
      paId: "",
      expiresInHours,
      requiresPa: false,
    });
    expect(errors.expiry).toBeDefined();
    expect(firstInvitationError(errors)).toBe("expiry");
  });
});
