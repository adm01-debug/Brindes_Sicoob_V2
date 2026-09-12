import { describe, expect, it } from "vitest";
import { validateLoginCredentials } from "@/lib/auth/login-validation";

describe("validateLoginCredentials", () => {
  it("exige os dois campos sem enviar dados incompletos", () => {
    expect(validateLoginCredentials({ email: "", password: "" })).toEqual({
      email: "Email é obrigatório",
      password: "Senha deve ter pelo menos 6 caracteres",
    });
  });

  it("rejeita endereço sem domínio e senha curta", () => {
    expect(validateLoginCredentials({ email: "usuario@", password: "12345" })).toEqual({
      email: "Email inválido",
      password: "Senha deve ter pelo menos 6 caracteres",
    });
  });

  it("aceita credenciais sintaticamente válidas", () => {
    expect(validateLoginCredentials({
      email: "compras@cooperativa.example",
      password: "senha-sintetica",
    })).toEqual({});
  });
});
