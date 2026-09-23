import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { secretsMatch } from "./internal-service-auth.ts";

Deno.test("secretsMatch aceita somente o mesmo segredo", async () => {
  assertEquals(await secretsMatch("segredo-interno", "segredo-interno"), true);
  assertEquals(await secretsMatch("segredo-interno", "segredo-diferente"), false);
  assertEquals(await secretsMatch("curto", "muito-mais-longo"), false);
});
