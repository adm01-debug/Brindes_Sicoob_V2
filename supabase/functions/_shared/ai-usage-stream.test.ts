import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractUsageFromSseLine } from "./ai-usage.ts";

Deno.test("extractUsageFromSseLine lê o uso final de um stream compatível com OpenAI", () => {
  assertEquals(
    extractUsageFromSseLine('data: {"choices":[],"usage":{"prompt_tokens":31,"completion_tokens":7}}'),
    { input: 31, output: 7 },
  );
});

Deno.test("extractUsageFromSseLine ignora fragmentos, eventos sem uso e marcador final", () => {
  assertEquals(extractUsageFromSseLine("data: [DONE]"), null);
  assertEquals(extractUsageFromSseLine('data: {"choices":[{"delta":{"content":"oi"}}]}'), null);
  assertEquals(extractUsageFromSseLine("evento inválido"), null);
});
