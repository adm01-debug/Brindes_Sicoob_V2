// supabase/functions/_shared/pgrest-filter.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sanitizeIlikeValue } from "./pgrest-filter.ts";

Deno.test("sanitizeIlikeValue neutraliza tentativa de injeção de condição", () => {
  // vírgula/parêntese tentando injetar nova condição no filtro `.or()`
  const out = sanitizeIlikeValue("foo),id.eq.1,(name");
  assertEquals(/[(),]/.test(out), false);
});

Deno.test("sanitizeIlikeValue remove parênteses, vírgulas e asteriscos", () => {
  const out = sanitizeIlikeValue("a,b(c)d*e");
  assertEquals(out.includes(","), false);
  assertEquals(out.includes("("), false);
  assertEquals(out.includes(")"), false);
  assertEquals(out.includes("*"), false);
});

Deno.test("sanitizeIlikeValue escapa wildcards LIKE", () => {
  assertEquals(sanitizeIlikeValue("100%_off"), "100\\%\\_off");
});

Deno.test("sanitizeIlikeValue remove barras invertidas pré-existentes", () => {
  assertEquals(sanitizeIlikeValue("a\\b"), "ab");
});

Deno.test("sanitizeIlikeValue preserva texto comum", () => {
  assertEquals(sanitizeIlikeValue("Caneta Azul"), "Caneta Azul");
});
