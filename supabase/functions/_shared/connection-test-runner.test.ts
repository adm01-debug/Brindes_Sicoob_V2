// deno-lint-ignore-file no-import-prefix
import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  ConnectionTestPersistenceError,
  persistConnectionTestResult,
  type RunResult,
} from "./connection-test-runner.ts";

const RESULT: RunResult = {
  ok: true,
  status: 200,
  latency_ms: 10,
  tested_at: "2026-10-16T12:00:00.000Z",
};

function makePersistenceClient(
  options: { updateError?: boolean; historyError?: boolean },
): SupabaseClient {
  return {
    from(table: string) {
      if (table === "external_connections") {
        return {
          update: () => ({
            eq: () =>
              Promise.resolve({
                error: options.updateError
                  ? { message: "update failed" }
                  : null,
              }),
          }),
        };
      }
      return {
        insert: () =>
          Promise.resolve({
            error: options.historyError ? { message: "insert failed" } : null,
          }),
      };
    },
    rpc: () => ({}),
    auth: {},
  } as unknown as SupabaseClient;
}

Deno.test("persistência propaga erro ao atualizar a conexão", async () => {
  const error = await assertRejects(
    () =>
      persistConnectionTestResult({
        type: "supabase",
        connection_id: "connection-1",
        service: makePersistenceClient({ updateError: true }),
      }, RESULT),
    ConnectionTestPersistenceError,
  );

  assertEquals(error.stage, "connection");
});

Deno.test("persistência propaga erro ao gravar histórico", async () => {
  const error = await assertRejects(
    () =>
      persistConnectionTestResult({
        type: "supabase",
        connection_id: "connection-1",
        service: makePersistenceClient({ historyError: true }),
      }, RESULT),
    ConnectionTestPersistenceError,
  );

  assertEquals(error.stage, "history");
});

Deno.test("persistência bem-sucedida preserva o resultado do probe", async () => {
  const result = await persistConnectionTestResult({
    type: "supabase",
    connection_id: "connection-1",
    service: makePersistenceClient({}),
    attempts: 2,
  }, RESULT);

  assertEquals(result, { ...RESULT, connection_id: "connection-1" });
});
