// deno-lint-ignore-file no-import-prefix
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  ConnectionTestPersistenceError,
  type RunResult,
} from "../_shared/connection-test-runner.ts";
import { type ActiveConnection, processBatch } from "./index.ts";

const CONNECTION: ActiveConnection = {
  id: "connection-1",
  type: "supabase",
  name: "Catálogo Promobrind",
  env_key: "promobrind",
  config: { url: "https://catalogo.example.com", key: "secret-placeholder" },
  created_by: "user-1",
};

const SERVICE = {
  from: () => ({}),
  rpc: () => ({}),
  auth: {},
} as unknown as SupabaseClient;

Deno.test("auto-teste persiste o último probe sem repetir chamada externa", async () => {
  let probes = 0;
  let persisted = 0;
  let persistedAttempts = 0;
  const sleeps: number[] = [];

  const results = await processBatch(SERVICE, [CONNECTION], {
    runTest: (): Promise<RunResult> => {
      probes += 1;
      return Promise.resolve(
        probes === 1
          ? {
            ok: false,
            error: "falha de rede",
            error_kind: "network",
            tested_at: "2026-10-16T12:00:00.000Z",
          }
          : {
            ok: true,
            status: 200,
            latency_ms: 25,
            tested_at: "2026-10-16T12:00:01.000Z",
          },
      );
    },
    persistResult: (options, result) => {
      persisted += 1;
      persistedAttempts = options.attempts ?? 0;
      return Promise.resolve(result);
    },
    sleep: (delayMs) => {
      sleeps.push(delayMs);
      return Promise.resolve();
    },
  });

  assertEquals(probes, 2);
  assertEquals(persisted, 1);
  assertEquals(persistedAttempts, 2);
  assertEquals(sleeps, [500]);
  assertEquals(results[0], {
    id: "connection-1",
    ok: true,
    probe_ok: true,
    persisted: true,
    latency_ms: 25,
    attempts: 2,
  });
});

Deno.test("auto-teste torna falha de persistência observável", async () => {
  const results = await processBatch(SERVICE, [CONNECTION], {
    runTest: () =>
      Promise.resolve({
        ok: true,
        status: 200,
        latency_ms: 12,
        tested_at: "2026-10-16T12:00:00.000Z",
      }),
    persistResult: () =>
      Promise.reject(new ConnectionTestPersistenceError("history")),
  });

  assertEquals(results[0], {
    id: "connection-1",
    ok: false,
    probe_ok: true,
    persisted: false,
    latency_ms: 12,
    attempts: 1,
    persistence_error: true,
    error: "falha_ao_persistir_resultado",
  });
});
