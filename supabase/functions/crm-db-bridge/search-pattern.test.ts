import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { escapeIlikeSearchTerm } from "../_shared/ilike-pattern.ts";

Deno.test("escapeIlikeSearchTerm trata % e _ como caracteres literais", () => {
  assertEquals(escapeIlikeSearchTerm("promo%_2026"), "promo\\%\\_2026");
});

Deno.test("escapeIlikeSearchTerm duplica barras invertidas antes do padrão LIKE", () => {
  assertEquals(escapeIlikeSearchTerm("loja\\regional"), "loja\\\\regional");
});
