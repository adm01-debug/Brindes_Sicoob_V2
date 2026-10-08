/** P0 — contratos reais das integrações externas e seus fallbacks. */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFreshFromCacheSafe,
  immutableCacheStats,
  invalidateImmutableCache,
  putInCacheSafe,
} from "@/lib/external-db/immutableCache";
import { friendlyErrorMessage, withRetry } from "@/hooks/voice/retry";
import { extractCloudflareStreamId, getCloudflareEmbedUrl } from "@/utils/cloudflare-stream";
import { expectContract, expectInOrder, source } from "./_contracts";

afterEach(() => {
  invalidateImmutableCache();
  vi.useRealTimers();
});

describe("P0 — integrações externas", () => {
  it("catálogo: mantém referências já obtidas disponíveis no cache local", () => {
    putInCacheSafe("categories", { id: "cat-1", name: "Sustentáveis" });

    expect(getFreshFromCacheSafe("categories", "cat-1")).toEqual({ id: "cat-1", name: "Sustentáveis" });
    expect(immutableCacheStats().categories).toBe(1);
    invalidateImmutableCache("categories");
    expect(getFreshFromCacheSafe("categories", "cat-1")).toBeUndefined();
  });

  it("catálogo: sinaliza indisponibilidade confirmada sem tratar falha como lista vazia", () => {
    const invoke = source("src/lib/external-db/invoke.ts");

    expectContract(invoke, [
      "const cached = getCachedCloudStatus()",
      "cached.status !== 'down' && cached.status !== 'degraded'",
      "await ensureCloudReady(3000, true)",
      "emitBridgeStatus({ type: 'unavailable'",
      "return finalizeInvoke({ data: null, error }, telemetry)",
      "compatibilityError(data)",
    ]);
  });

  it("consulta CNPJ: valida entrada, autentica e usa fetch externo com timeout/circuit breaker", () => {
    const lookup = source("supabase/functions/cnpj-lookup/index.ts");
    const externalFetch = source("supabase/functions/_shared/external-fetch.ts");

    expectInOrder(lookup, [
      'req.headers.get("Authorization")',
      "supabase.auth.getUser()",
      "CnpjBodySchema.safeParse",
      "fetchWithBreaker(",
    ]);
    expectContract(externalFetch, [
      "const DEFAULT_TIMEOUT_MS = 15_000",
      "const controller = new AbortController()",
      "controller.abort()",
      "clearTimeout(timeout)",
    ]);
  });

  it("Cloudflare Stream: só gera embed para IDs válidos e preserva poster", () => {
    const streamId = "0123456789abcdef0123456789abcdef";

    expect(extractCloudflareStreamId(`https://videodelivery.net/${streamId}/manifest/video.m3u8`)).toBe(streamId);
    expect(getCloudflareEmbedUrl("https://videodelivery.net/invalido")).toBeNull();
    const embed = new URL(getCloudflareEmbedUrl(streamId, { autoplay: true, poster: "/fallback.jpg" })!);
    expect(embed.hostname).toBe("iframe.videodelivery.net");
    expect(embed.searchParams.get("autoplay")).toBe("true");
    expect(embed.searchParams.get("poster")).toBe("/fallback.jpg");
  });

  it("ElevenLabs: falha de crédito mantém mensagem textual amigável", () => {
    const ttsHook = source("src/components/expert/chat/useExpertChatTts.ts");

    expect(friendlyErrorMessage(new Error("HTTP 402: insufficient credits"))).toBe(
      "Créditos de IA esgotados. Contate o administrador.",
    );
    expectContract(ttsHook, [
      "setTtsErrorId(messageId)",
      'toast.error("Não foi possível reproduzir o áudio"',
      "setLoadingTtsId(null)",
    ]);
  });

  it("voz: 429 é retentável com backoff e limite de tentativas", async () => {
    vi.useFakeTimers();
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("HTTP 429"))
      .mockResolvedValueOnce("áudio");

    const resultPromise = withRetry(operation, { maxRetries: 1, baseDelay: 20 });
    await vi.advanceTimersByTimeAsync(20);

    await expect(resultPromise).resolves.toBe("áudio");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("Lovable AI: diferencia rate limit de falta de crédito sem expor resposta bruta", () => {
    const expert = source("supabase/functions/expert-chat/index.ts");

    expectContract(expert, [
      "if (response.status === 429)",
      "Limite de requisições excedido. Aguarde alguns minutos.",
      "if (response.status === 402)",
      "Créditos de IA esgotados. Adicione créditos na workspace.",
    ]);
    expect(expert).not.toContain("JSON.stringify({ error: errorText })");
  });

  it("connections-auto-test: aplica timeout por tipo e retry só a falhas transitórias", () => {
    const autoTest = source("supabase/functions/connections-auto-test/index.ts");

    expectContract(autoTest, [
      "const perTypeTimeout = resolveTimeout(connType)",
      "timeoutMs: perTypeTimeout",
      "isTransientFailure(probe)",
      "attempt < MAX_ATTEMPTS",
      "latency_ms: final.latency_ms",
    ]);
  });
});
