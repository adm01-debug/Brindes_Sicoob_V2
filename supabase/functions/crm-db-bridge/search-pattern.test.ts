import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { escapeIlikeSearchTerm } from "../_shared/ilike-pattern.ts";

Deno.test("escapeIlikeSearchTerm trata % e _ como caracteres literais", () => {
  assertEquals(escapeIlikeSearchTerm("promo%_2026"), "promo\\%\\_2026");
});

Deno.test("escapeIlikeSearchTerm duplica barras invertidas antes do padrão LIKE", () => {
  assertEquals(escapeIlikeSearchTerm("loja\\regional"), "loja\\\\regional");
});

Deno.test("preserva termo legítimo: o helper só neutraliza curinga", () => {
  // Diferente de `sanitizeIlikeValue` (de `_shared/pgrest-filter.ts`, feito
  // para `.or(...)` do PostgREST), este helper não troca parênteses por espaço
  // nem corta o termo: busca por nome de agência chega inteira ao banco.
  assertEquals(
    escapeIlikeSearchTerm("Sicoob (Agência Centro)"),
    "Sicoob (Agência Centro)",
  );
});

Deno.test("termo vazio continua vazio", () => {
  assertEquals(escapeIlikeSearchTerm(""), "");
});
