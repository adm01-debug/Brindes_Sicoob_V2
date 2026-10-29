import { describe, expect, it } from "vitest";
import { hasJwtStructure } from "../../supabase/functions/_shared/jwt-structure";

const encode = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

describe("estrutura do JWT antes da validação remota", () => {
  it("rejeita o bearer malformado usado no teste remoto de autorização", () => {
    expect(hasJwtStructure("invalid.jwt.token")).toBe(false);
  });

  it("rejeita tokens que não têm exatamente três segmentos não vazios", () => {
    expect(hasJwtStructure("header.payload")).toBe(false);
    expect(hasJwtStructure("header..signature")).toBe(false);
    expect(hasJwtStructure("opaque-access-token")).toBe(false);
  });

  it("rejeita segmentos de cabeçalho ou payload que não sejam objetos JSON", () => {
    const signature = "c2lnbmF0dXJl";
    expect(hasJwtStructure(`${encode([])}.${encode({ sub: "user-id" })}.${signature}`)).toBe(false);
    expect(hasJwtStructure(`${encode({ alg: "HS256" })}.${encode("payload")}.${signature}`)).toBe(false);
  });

  it("aceita a estrutura JWT bem formada sem afirmar que a assinatura é válida", () => {
    const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "user-id" })}.c2lnbmF0dXJl`;
    expect(hasJwtStructure(token)).toBe(true);
  });
});
