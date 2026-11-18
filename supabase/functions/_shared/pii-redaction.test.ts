import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { redactPotentialPii } from "./pii-redaction.ts";

Deno.test("redactPotentialPii remove e-mail, CPF, CNPJ e telefone", () => {
  assertEquals(redactPotentialPii("ana@coop.com 123.456.789-09"), "[e-mail removido] [documento removido]");
  assertEquals(redactPotentialPii("12.345.678/0001-90"), "[documento removido]");
  assertEquals(redactPotentialPii("(61) 99999-1234"), "[telefone removido]");
});

Deno.test("redactPotentialPii preserva termo comercial comum", () => {
  assertEquals(redactPotentialPii("caneca térmica verde"), "caneca térmica verde");
});
