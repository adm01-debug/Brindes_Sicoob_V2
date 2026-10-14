import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deferBackgroundTask } from "./background-task.ts";

Deno.test("deferBackgroundTask registra a Promise no EdgeRuntime", async () => {
  const original = (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime;
  const scheduled: Promise<unknown>[] = [];
  (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime = {
    waitUntil(promise: Promise<unknown>) {
      scheduled.push(promise);
    },
  };

  try {
    deferBackgroundTask(Promise.resolve("ok"), "teste");
    assertEquals(scheduled.length, 1);
    assertEquals(await scheduled[0], "ok");
  } finally {
    (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime = original;
  }
});

Deno.test("deferBackgroundTask absorve falha da tarefa secundária", async () => {
  const original = (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime;
  const originalWarn = console.warn;
  const scheduled: Promise<unknown>[] = [];
  const warnings: unknown[][] = [];
  (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime = {
    waitUntil(promise: Promise<unknown>) {
      scheduled.push(promise);
    },
  };
  console.warn = (...args: unknown[]) => warnings.push(args);

  try {
    deferBackgroundTask(Promise.reject(new Error("falha esperada")), "teste");
    await scheduled[0];
    assertEquals(warnings.length, 1);
    assertEquals(String(warnings[0][0]).includes("teste"), true);
  } finally {
    console.warn = originalWarn;
    (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime = original;
  }
});
