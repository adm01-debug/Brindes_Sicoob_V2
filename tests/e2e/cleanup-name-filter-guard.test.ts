/**
 * Catraca: a limpeza E2E só apaga o que é dos testes.
 *
 * Regra travada (recuperada da PR #176, fechada sem merge — o teste órfão era
 * `tests/unit/e2e-cleanup-client.test.ts`, escrito contra uma API que não
 * existe mais; aqui ela é reescrita contra a API atual da `main`):
 *   1. o filtro por prefixo de nome é ATIVO POR PADRÃO e viaja em TODA
 *      requisição de purge (`e2e/helpers/cleanup-client.ts`);
 *   2. um escopo de spec nunca sai do namespace `[E2E:...]` e um rótulo amplo
 *      (wildcard de LIKE, vazio) é recusado/neutralizado
 *      (`e2e/fixtures/test-user.ts`);
 *   3. cada persona configurada é purgada exatamente uma vez.
 *
 * Complementa `tests/e2e/cleanup-target-guard.test.ts`, que trava o DESTINO
 * (allowlist de projeto, dry-run, falha parcial) e não o prefixo.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCleanupConfig, purgeAll, purgeOne } from "../../e2e/helpers/cleanup-client";
import { e2eName, e2eScope, isE2eName } from "../../e2e/fixtures/test-user";

const validTarget = {
  E2E_SUPABASE_URL: "https://qa-sicoob-123.supabase.co",
  E2E_SUPABASE_PROJECT_ID: "qa-sicoob-123",
  E2E_ALLOWED_PROJECT_ID: "qa-sicoob-123",
  E2E_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_qa",
  E2E_SUPABASE_SERVICE_ROLE_KEY: "sb_secret_qa",
  E2E_CLEANUP_TOKEN: "cleanup-test-token",
  E2E_USER_EMAIL: "qa@example.test",
};

const fastRetry = {
  retryPolicy: { attempts: 1, baseDelayMs: 1, maxDelayMs: 1, requestTimeoutMs: 500 },
  quiet: true,
} as const;

function stubEnv(extra: Record<string, string> = {}) {
  Object.entries({ ...validTarget, ...extra }).forEach(([key, value]) =>
    vi.stubEnv(key, value),
  );
}

function stubFetchOk() {
  const fetchMock = vi.fn(
    async (_url: unknown, _init?: RequestInit) =>
      new Response(JSON.stringify({ ok: true, dryRun: true, deleted: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Prefixos enviados em cada POST ao `e2e-cleanup`, na ordem das chamadas. */
function sentPrefixes(fetchMock: ReturnType<typeof stubFetchOk>) {
  return fetchMock.mock.calls.map(
    ([, init]) => JSON.parse(String(init?.body)).nameFilterPrefix as string | undefined,
  );
}

describe("cleanup E2E escopado pelo prefixo de nome", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("nasce com o filtro de nome ligado, sem precisar de configuração", () => {
    stubEnv();
    expect(loadCleanupConfig()?.nameFilterPrefix).toBe("[E2E]");
  });

  it("honra o prefixo customizado do rodízio de testes", () => {
    stubEnv({ E2E_TEST_PREFIX: "[E2E] rodada-42" });
    expect(loadCleanupConfig()?.nameFilterPrefix).toBe("[E2E] rodada-42");
  });

  it("manda o prefixo em TODA requisição de purge, persona por persona", async () => {
    stubEnv({ E2E_ADMIN_EMAIL: "qa-admin@example.test" });
    const fetchMock = stubFetchOk();

    await purgeAll(loadCleanupConfig()!, fastRetry);

    const emails = fetchMock.mock.calls.map(
      ([, init]) => JSON.parse(String(init?.body)).email as string,
    );
    expect(emails).toEqual(["qa@example.test", "qa-admin@example.test"]);
    expect(sentPrefixes(fetchMock)).toEqual(["[E2E]", "[E2E]"]);
  });

  it("escopa por spec sem sair do namespace E2E", async () => {
    stubEnv();
    const fetchMock = stubFetchOk();

    await purgeOne(loadCleanupConfig()!, "qa@example.test", {
      ...fastRetry,
      nameFilterPrefix: e2eScope("quote-create"),
    });

    expect(sentPrefixes(fetchMock)).toEqual(["[E2E:quote-create]"]);
  });

  it("purga cada persona exatamente uma vez, mesmo com e-mails repetidos", async () => {
    stubEnv({ E2E_ADMIN_EMAIL: "QA@Example.test" });
    const fetchMock = stubFetchOk();

    await purgeAll(loadCleanupConfig()!, fastRetry);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recusa rótulo amplo no escopo e só reconhece nome do namespace E2E", () => {
    stubEnv();
    // Wildcard de LIKE e rótulo vazio nunca viram prefixo de purga.
    expect(e2eScope("%")).toBe("[E2E:spec]");
    expect(e2eScope("")).toBe("[E2E:spec]");
    expect(e2eScope("quote create!")).toBe("[E2E:quote-create]");

    expect(isE2eName(e2eName("orcamento"))).toBe(true);
    expect(isE2eName(e2eName("orcamento", { prefix: e2eScope("kit-builder") }))).toBe(true);
    expect(isE2eName("[E2Evil] dado manual")).toBe(false);
    expect(isE2eName("%")).toBe(false);
    expect(isE2eName("orçamento do cliente")).toBe(false);
  });
});
