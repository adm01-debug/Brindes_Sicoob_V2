import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractUsageFromSseLine, trackStreamingResponse } from "./ai-usage.ts";

const usageEvent = (input: number, output: number) =>
  `data: ${
    JSON.stringify({
      choices: [],
      usage: { prompt_tokens: input, completion_tokens: output },
    })
  }`;

interface UsageUpdate {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  durationMs?: number;
  status?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

function createUpdater() {
  const updates: UsageUpdate[] = [];
  return {
    updates,
    update: async (params: UsageUpdate) => {
      updates.push(params);
    },
  };
}

Deno.test("extractUsageFromSseLine lê o uso final de um stream compatível com OpenAI", () => {
  assertEquals(
    extractUsageFromSseLine(
      'data: {"choices":[],"usage":{"prompt_tokens":31,"completion_tokens":7}}',
    ),
    { input: 31, output: 7 },
  );
});

Deno.test("extractUsageFromSseLine ignora fragmentos, eventos sem uso e marcador final", () => {
  assertEquals(extractUsageFromSseLine("data: [DONE]"), null);
  assertEquals(
    extractUsageFromSseLine('data: {"choices":[{"delta":{"content":"oi"}}]}'),
    null,
  );
  assertEquals(extractUsageFromSseLine("evento inválido"), null);
});

Deno.test("trackStreamingResponse finaliza uma vez no EOF e registra os tokens", async () => {
  const updater = createUpdater();
  const response = new Response(`${usageEvent(31, 7)}\n\n`);
  const tracked = await trackStreamingResponse(
    response,
    "openai/gpt-5-mini",
    Date.now(),
    updater.update,
  );

  assertEquals(await tracked.text(), `${usageEvent(31, 7)}\n\n`);
  assertEquals(updater.updates.length, 1);
  assertEquals(updater.updates[0].status, "success");
  assertEquals(updater.updates[0].inputTokens, 31);
  assertEquals(updater.updates[0].outputTokens, 7);
  assertEquals(updater.updates[0].totalTokens, 38);
});

Deno.test("trackStreamingResponse registra uso parcial ao consumidor cancelar", async () => {
  const updater = createUpdater();
  let upstreamCanceled = false;
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(usageEvent(19, 4)));
    },
    cancel() {
      upstreamCanceled = true;
    },
  });
  const tracked = await trackStreamingResponse(
    new Response(source),
    "openai/gpt-5-mini",
    Date.now(),
    updater.update,
  );
  const reader = tracked.body!.getReader();
  await reader.read();
  await reader.cancel("client disconnected");

  assertEquals(updater.updates.length, 1);
  assertEquals(updater.updates[0].status, "error");
  assertEquals(updater.updates[0].inputTokens, 19);
  assertEquals(updater.updates[0].outputTokens, 4);
  assertEquals(
    updater.updates[0].errorMessage,
    "Stream interrupted: client disconnected",
  );
  assertEquals(
    (updater.updates[0].metadata as Record<string, unknown>).interrupted,
    true,
  );
  assertEquals(upstreamCanceled, true);
});

Deno.test("trackStreamingResponse finaliza log quando o stream falha depois de emitir uso", async () => {
  const updater = createUpdater();
  let emitted = false;
  const source = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!emitted) {
        emitted = true;
        controller.enqueue(new TextEncoder().encode(`${usageEvent(11, 3)}\n`));
      } else {
        controller.error(new Error("upstream reset"));
      }
    },
  });
  const tracked = await trackStreamingResponse(
    new Response(source),
    "openai/gpt-5-mini",
    Date.now(),
    updater.update,
  );
  const reader = tracked.body!.getReader();
  await reader.read();
  await assertRejects(() => reader.read(), Error, "upstream reset");
  assertEquals(updater.updates.length, 1);
  assertEquals(updater.updates[0].status, "error");
  assertEquals(updater.updates[0].inputTokens, 11);
  assertEquals(updater.updates[0].outputTokens, 3);
});

Deno.test("trackStreamingResponse encerra leitura pendente e atualiza uma única vez no cancelamento", async () => {
  const updater = createUpdater();
  let releasePull: (() => void) | undefined;
  let upstreamCanceled = false;
  const source = new ReadableStream<Uint8Array>({
    pull() {
      return new Promise<void>((resolve) => {
        releasePull = resolve;
      });
    },
    cancel() {
      upstreamCanceled = true;
      releasePull?.();
    },
  });
  const tracked = await trackStreamingResponse(
    new Response(source),
    "openai/gpt-5-mini",
    Date.now(),
    updater.update,
  );
  const reader = tracked.body!.getReader();
  const pendingRead = reader.read();
  await Promise.resolve();
  await reader.cancel("disconnect during read");
  await pendingRead;

  assertEquals(upstreamCanceled, true);
  assertEquals(updater.updates.length, 1);
  assertEquals(updater.updates[0].status, "error");
});

Deno.test("trackStreamingResponse finaliza com erro uma resposta sem corpo", async () => {
  const updater = createUpdater();
  const response = new Response(null, { status: 204 });
  const tracked = await trackStreamingResponse(
    response,
    "openai/gpt-5-mini",
    Date.now(),
    updater.update,
  );

  assertEquals(tracked.status, 204);
  assertEquals(updater.updates.length, 1);
  assertEquals(updater.updates[0].status, "error");
  assertEquals(
    updater.updates[0].errorMessage,
    "Successful stream response had no body",
  );
});
