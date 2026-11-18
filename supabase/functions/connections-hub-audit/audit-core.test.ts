// deno-lint-ignore-file no-import-prefix
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  classifyEdgeProbe,
  isCronEvidenceHealthy,
  probeEdgeFunction,
} from "./audit-core.ts";

const NOW = Date.parse("2026-10-16T12:00:00.000Z");

Deno.test("evidência de cron exige job ativo, sucesso e execução recente", () => {
  assertEquals(
    isCronEvidenceHealthy(
      {
        active: true,
        last_status: "succeeded",
        last_run_at: "2026-10-16T11:45:00.000Z",
      },
      20,
      NOW,
    ),
    true,
  );
  assertEquals(
    isCronEvidenceHealthy(
      {
        active: true,
        last_status: "succeeded",
        last_run_at: "2026-10-16T11:39:59.000Z",
      },
      20,
      NOW,
    ),
    false,
  );
  assertEquals(
    isCronEvidenceHealthy(
      {
        active: true,
        last_status: "failed",
        last_run_at: "2026-10-16T11:59:00.000Z",
      },
      20,
      NOW,
    ),
    false,
  );
});

Deno.test("probe de Edge Function aceita respostas que comprovam endpoint implantado", () => {
  assertEquals(classifyEdgeProbe(204).ok, true);
  assertEquals(classifyEdgeProbe(401).ok, true);
  assertEquals(classifyEdgeProbe(403).ok, true);
  assertEquals(classifyEdgeProbe(405).ok, true);
});

Deno.test("probe de Edge Function rejeita ausência e indisponibilidade", () => {
  assertEquals(classifyEdgeProbe(404).ok, false);
  assertEquals(classifyEdgeProbe(429).ok, false);
  assertEquals(classifyEdgeProbe(500).ok, false);
});

Deno.test("probe usa OPTIONS e não executa operação da função", async () => {
  let method = "";
  const fetcher: typeof fetch = (_input, init) => {
    method = init?.method ?? "GET";
    return Promise.resolve(new Response(null, { status: 204 }));
  };

  const result = await probeEdgeFunction(
    "https://projeto.supabase.co",
    "service-key",
    "connection-tester",
    fetcher,
  );

  assertEquals(method, "OPTIONS");
  assertEquals(result.ok, true);
});
