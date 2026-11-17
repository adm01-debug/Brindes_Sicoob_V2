import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildScheduledReportIdempotencyKey } from "./scheduled-report-email.ts";

const scope = "scheduled-report:report-1:2026-11-17T08:00:00.000Z";
const payload = {
  to: "gestor@sicoob.com.br",
  subject: "Relatorio de Orcamentos",
  html: "<p>conteudo</p>",
};

Deno.test("retry com o mesmo payload reutiliza a chave", async () => {
  assertEquals(
    await buildScheduledReportIdempotencyKey(scope, payload),
    await buildScheduledReportIdempotencyKey(scope, payload),
  );
});

Deno.test("payload diferente no mesmo ciclo gera chave nova", async () => {
  const base = await buildScheduledReportIdempotencyKey(scope, payload);
  assertNotEquals(
    base,
    await buildScheduledReportIdempotencyKey(scope, { ...payload, subject: "Outro assunto" }),
  );
  assertNotEquals(
    base,
    await buildScheduledReportIdempotencyKey(scope, { ...payload, to: "outro@sicoob.com.br" }),
  );
  assertNotEquals(
    base,
    await buildScheduledReportIdempotencyKey(scope, { ...payload, html: "<p>outro</p>" }),
  );
});

Deno.test("a chave respeita o limite aceito pelo provedor", async () => {
  const key = await buildScheduledReportIdempotencyKey("x".repeat(400), payload);
  assertEquals(key.length <= 256, true);
});