import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { AUTO_TESTABLE_CONNECTION_STATUSES } from "./index.ts";

Deno.test("connections-auto-test mantém conexões com falha no ciclo de recuperação", () => {
  assertEquals([...AUTO_TESTABLE_CONNECTION_STATUSES], ["active", "degraded", "error"]);
});
