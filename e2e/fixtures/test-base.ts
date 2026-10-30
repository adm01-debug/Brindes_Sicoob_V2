/**
 * Test base estendendo o Playwright com:
 *  - Captura automática de console/pageerror em toda página
 *  - afterEach que dispara coleta de evidências em qualquer falha
 *  - Helper `requireAuth()` que pula o teste se as credenciais não foram dadas
 *  - Fixture `e2eResources` com sub-prefixo POR TESTE e cleanup escopado
 *    em caso de falha — evita que um teste apague recursos vivos de outro
 *    teste em execução paralela.
 *
 * Uso:
 *   import { test, expect } from "../fixtures/test-base";
 *
 *   test("...", async ({ page, resources }) => {
 *     const { name } = await resources.createQuote({ label: "approval", submit: true });
 *     // ...
 *   });
 */
import { createHash } from "node:crypto";
import { test as base, expect } from "@playwright/test";
import { attachConsoleCapture, type EvidenceCollector } from "../helpers/evidence";
import { loadCleanupConfig, purgeAll } from "../helpers/cleanup-client";
import { e2eScope } from "./test-user";
import {
  createE2eQuote,
  createE2eCollection,
  createE2eFavoriteList,
  createE2eCartTemplate,
  createE2eCustomKit,
} from "../helpers/e2e-resources";

interface CreateOpts {
  label?: string;
  submit?: boolean;
}

export interface E2eResources {
  /** Sub-prefixo derivado do basename do arquivo do spec, ex.: `[E2E:quote-create]`. */
  prefix: string;
  createQuote: (opts?: CreateOpts) => Promise<{ name: string }>;
  createCollection: (opts?: CreateOpts) => Promise<{ name: string }>;
  createFavoriteList: (opts?: CreateOpts) => Promise<{ name: string }>;
  createCartTemplate: (opts?: CreateOpts) => Promise<{ name: string }>;
  createCustomKit: (opts?: CreateOpts) => Promise<{ name: string }>;
}

type Fixtures = {
  evidence: EvidenceCollector;
  resources: E2eResources;
  /**
   * Auto-fixture: em falha, dispara purge ESCOPADO ao prefixo do spec
   * (não toca em recursos de outros specs paralelos). Pode ser desligada
   * via `E2E_CLEANUP_ON_FAILURE=0`.
   */
  cleanupOnFailure: void;
};

export const test = base.extend<Fixtures>({
  evidence: async ({ page }, use, testInfo) => {
    const collector = attachConsoleCapture(page);
    await use(collector);
    if (testInfo.status !== testInfo.expectedStatus) {
      await collector.attachAll(page, testInfo);
    }
  },

  resources: async ({ page }, use, testInfo) => {
    const testId = createHash("sha256").update(testInfo.testId).digest("hex").slice(0, 24);
    const prefix = e2eScope(`t-${testId}`);
    const api: E2eResources = {
      prefix,
      createQuote: (o = {}) => createE2eQuote(page, { ...o, prefix }),
      createCollection: (o = {}) => createE2eCollection(page, { ...o, prefix }),
      createFavoriteList: (o = {}) => createE2eFavoriteList(page, { ...o, prefix }),
      createCartTemplate: (o = {}) => createE2eCartTemplate(page, { ...o, prefix }),
      createCustomKit: (o = {}) => createE2eCustomKit(page, { ...o, prefix }),
    };
    await use(api);
  },

  cleanupOnFailure: [
    async ({ resources }, use, testInfo) => {
      await use();
      if (process.env.E2E_CLEANUP_ON_FAILURE === "0") return;
      if (testInfo.status === testInfo.expectedStatus) return;
      const cfg = loadCleanupConfig();
      if (!cfg) return;
      await purgeAll(cfg, {
        quiet: true,
        reason: `failure:${testInfo.title}`,
        nameFilterPrefix: resources.prefix,
      });
    },
    { auto: true },
  ],
});

export { expect };

/** Marca o teste como skip se as credenciais E2E_USER_* não foram fornecidas. */
export function requireAuth(reason = "E2E_USER_EMAIL/PASSWORD não configurados") {
  test.skip(!process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD, reason);
}

/** Marca o teste como skip se as credenciais admin não foram fornecidas. */
export function requireAdmin(reason = "E2E_ADMIN_EMAIL/PASSWORD não configurados") {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    reason,
  );
}
