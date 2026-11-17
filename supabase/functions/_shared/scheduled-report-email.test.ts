import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildScheduledReportIdempotencyKey } from "./scheduled-report-email.ts";

const scope = "scheduled-report:report-1:2026-11-17T08:00:00.000Z";

Deno.test("a chave identifica o ciclo e nao o conteudo gerado", () => {
  assertEquals(buildScheduledReportIdempotencyKey(scope), scope);
  assertEquals(
    buildScheduledReportIdempotencyKey(scope),
    buildScheduledReportIdempotencyKey(scope),
  );
});

Deno.test("ciclos diferentes do mesmo agendamento nao compartilham chave", () => {
  const proximo = "scheduled-report:report-1:2026-11-24T08:00:00.000Z";
  assertEquals(buildScheduledReportIdempotencyKey(proximo) === scope, false);
});

Deno.test("a chave respeita o limite aceito pelo provedor", () => {
  const key = buildScheduledReportIdempotencyKey("x".repeat(400));
  assertEquals(key.length <= 256, true);
});