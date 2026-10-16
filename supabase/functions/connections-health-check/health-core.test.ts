// deno-lint-ignore-file no-import-prefix
import {
  assertEquals,
  assertMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildTestFreshnessIncident } from "./health-core.ts";

const NOW = Date.parse("2026-10-16T12:00:00.000Z");
const CONNECTION = {
  id: "connection-1",
  name: "Catálogo Promobrind",
  type: "supabase",
  last_test_at: null,
};

Deno.test("health-check cria incidente para conexão nunca testada", () => {
  const incident = buildTestFreshnessIncident(CONNECTION, NOW, 45);

  assertEquals(incident?.key, "connection_test_missing:connection-1");
  assertEquals(incident?.type, "warning");
});

Deno.test("health-check cria incidente para teste vencido", () => {
  const incident = buildTestFreshnessIncident(
    { ...CONNECTION, last_test_at: "2026-10-16T11:14:59.000Z" },
    NOW,
    45,
  );

  assertEquals(incident?.key, "connection_test_stale:connection-1");
  assertMatch(incident?.message ?? "", /mais de 45 minutos/);
});

Deno.test("health-check aceita teste ainda dentro da janela", () => {
  const incident = buildTestFreshnessIncident(
    { ...CONNECTION, last_test_at: "2026-10-16T11:15:00.000Z" },
    NOW,
    45,
  );

  assertEquals(incident, null);
});

Deno.test("health-check trata data inválida como teste vencido", () => {
  const incident = buildTestFreshnessIncident(
    { ...CONNECTION, last_test_at: "data-invalida" },
    NOW,
    45,
  );

  assertEquals(incident?.key, "connection_test_stale:connection-1");
});
