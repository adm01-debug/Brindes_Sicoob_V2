/** P0 — contratos reais de resiliência dos webhooks e conectores. */
import { describe, expect, it } from "vitest";
import { expectContract, expectInOrder, source } from "./_contracts";

describe("P0 — webhooks resilientes", () => {
  it("bitrix-sync: valida a operação antes de consultar serviços", () => {
    const handler = source("supabase/functions/bitrix-sync/index.ts");

    expectContract(handler, [
      "const BitrixSyncSchema = z.object",
      "BitrixSyncSchema.safeParse(await req.json())",
      "parsed.error.flatten()",
      /status:\s*400/,
    ]);
    expect(handler.indexOf("safeParse(await req.json())")).toBeLessThan(handler.indexOf("switch (action)"));
  });

  it("bitrix-sync: protege o upstream com circuit breaker", () => {
    const handler = source("supabase/functions/bitrix-sync/index.ts");

    expectContract(handler, [
      'fetchWithBreaker("bitrix"',
      "error instanceof CircuitOpenError",
      "circuitOpenResponse(error, corsHeaders)",
    ]);
  });

  it("backoff compartilhado: limita tentativas, usa jitter e respeita orçamento", () => {
    const retry = source("supabase/functions/_shared/retry-backoff.ts");

    expectContract(retry, [
      "const maxAttempts = opts.maxAttempts ?? 3",
      "nextDelayMs(prevDelay, baseMs, capMs)",
      "remainingBudget",
      "attempt === maxAttempts",
    ]);
  });

  it("backoff compartilhado: não repete erros permanentes", () => {
    const retry = source("supabase/functions/_shared/retry-backoff.ts");

    expectContract(retry, [
      "export function isTransientError",
      "if (!transient(err) || attempt === maxAttempts)",
      "throw err",
    ]);
  });

  it("sincronização n8n: resposta não OK vira falha explícita", () => {
    const quoteSync = source("supabase/functions/quote-sync/index.ts");
    const sendToN8n = quoteSync.slice(quoteSync.indexOf("async function sendToN8N"));

    expectInOrder(sendToN8n, [
      "async function sendToN8N",
      "await fetch(n8nWebhookUrl",
      "if (!response.ok)",
      "throw new Error(`N8N webhook failed:",
    ]);
  });

  it("sincronização n8n: falha do webhook não interrompe a persistência do fluxo", () => {
    const quoteSync = source("supabase/functions/quote-sync/index.ts");

    expectInOrder(quoteSync, [
      "try { n8nResponse = await sendToN8N(quoteData); }",
      'catch (err) { console.error("N8N sync failed (non-blocking):", err); }',
      "await sendToSalesPro(quoteData)",
      "await updateCRMSyncStatus(quoteId, n8nResponse)",
    ]);
  });

  it("sync-quote-bitrix: deriva destinos persistidos e protege o webhook", () => {
    const handler = source("supabase/functions/sync-quote-bitrix/index.ts");

    expectContract(handler, [
      "async function resolveBitrixTargets",
      ".from(\"companies\")",
      ".select(\"bitrix_company_id\")",
      'fetchWithBreaker("bitrix", webhookUrl',
      "if (!response.ok)",
      'admin.rpc("record_quote_bitrix_sync"',
    ]);
  });

  it("connection-tester: os diagnósticos não serializam valores de credenciais", () => {
    const tester = source("supabase/functions/connection-tester/index.ts");

    expectContract(tester, [
      /redact|mask|sanitize/i,
      /secret|credential|api.?key/i,
    ]);
    expect(tester).not.toMatch(/JSON\.stringify\([^)]*(?:secretValue|secret_value)\)/);
  });

  it("webhook inbound: rejeita HMAC inválido antes de processar o evento", () => {
    const handler = source("supabase/functions/webhook-inbound/index.ts");

    expectInOrder(handler, [
      "crypto.subtle.importKey",
      "crypto.subtle.sign",
      "timingSafeEqual(expected, provided)",
      "if (!signatureValid)",
      "status: 401",
    ]);
    expectContract(handler, ["eventAllowed", "signatureValid && eventAllowed"]);
  });
});
