import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCleanupConfig } from "../../e2e/helpers/cleanup-client";

const validTarget = {
  E2E_SUPABASE_URL: "https://qa-sicoob-123.supabase.co",
  E2E_SUPABASE_PROJECT_ID: "qa-sicoob-123",
  E2E_ALLOWED_PROJECT_ID: "qa-sicoob-123",
  E2E_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_qa",
  E2E_SUPABASE_SERVICE_ROLE_KEY: "sb_secret_qa",
  E2E_CLEANUP_TOKEN: "cleanup-test-token",
  E2E_USER_EMAIL: "qa@example.test",
};

describe("cleanup Playwright protegido por allowlist de QA", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("usa apenas a URL E2E validada, mesmo se URLs genéricas apontarem a outro projeto", () => {
    Object.entries({
      ...validTarget,
      VITE_SUPABASE_URL: "https://cfmzkthhgliqelozlmwu.supabase.co",
      SUPABASE_URL: "https://cfmzkthhgliqelozlmwu.supabase.co",
    }).forEach(([key, value]) => vi.stubEnv(key, value));

    const config = loadCleanupConfig();
    expect(config?.baseUrl).toBe(validTarget.E2E_SUPABASE_URL);
    expect(config?.dryRun).toBe(true);
  });

  it("só permite limpeza destrutiva com opt-in explícito", () => {
    Object.entries({ ...validTarget, E2E_CLEANUP_DRY_RUN: "0" }).forEach(
      ([key, value]) => vi.stubEnv(key, value),
    );

    expect(loadCleanupConfig()?.dryRun).toBe(false);
  });

  it("não habilita limpeza quando só existem variáveis genéricas", () => {
    Object.entries({
      VITE_SUPABASE_URL: "https://cfmzkthhgliqelozlmwu.supabase.co",
      SUPABASE_URL: "https://cfmzkthhgliqelozlmwu.supabase.co",
      E2E_CLEANUP_TOKEN: "cleanup-test-token",
      E2E_USER_EMAIL: "qa@example.test",
    }).forEach(([key, value]) => vi.stubEnv(key, value));

    expect(loadCleanupConfig()).toBeNull();
  });

  it("recusa explicitamente o projeto canônico, mesmo se alguém o colocar na allowlist", () => {
    Object.entries({
      ...validTarget,
      E2E_SUPABASE_URL: "https://cfmzkthhgliqelozlmwu.supabase.co",
      E2E_SUPABASE_PROJECT_ID: "cfmzkthhgliqelozlmwu",
      E2E_ALLOWED_PROJECT_ID: "cfmzkthhgliqelozlmwu",
    }).forEach(([key, value]) => vi.stubEnv(key, value));

    expect(() => loadCleanupConfig()).toThrow("allowlist");
  });

  it("falha visivelmente quando a Edge Function reporta limpeza incompleta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: true, dryRun: false, errors: { quotes: "negado" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const { purgeAll } = await import("../../e2e/helpers/cleanup-client");

    await expect(
      purgeAll(
        {
          baseUrl: "https://qa-sicoob-123.supabase.co",
          token: "cleanup-test-token",
          userEmail: "qa@example.test",
          dryRun: false,
        },
        { retryPolicy: { attempts: 1, baseDelayMs: 1, maxDelayMs: 1, requestTimeoutMs: 500 } },
      ),
    ).rejects.toThrow("Limpeza E2E incompleta para E2E_USER_EMAIL");
  });
});
