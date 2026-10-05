/**
 * E2E Test Configuration — Playwright
 *
 * Estrutura:
 *  - project "setup": roda e2e/fixtures/auth.setup.ts UMA VEZ e gera storageState.json
 *  - project "chromium-public": specs sem auth (login, públicos)
 *  - project "chromium-authed": specs autenticados (depende de setup)
 *
 * Hardening anti-flake:
 *  - headless POR PADRÃO (sobrescrevível por --headed ou E2E_HEADLESS=false)
 *  - retries controlados: CI=2, local=1 (override por E2E_RETRIES=N)
 *  - expect.timeout elevado (15s) para reduzir polls inflados nos specs
 *  - reducedMotion: "reduce" para neutralizar animações (Radix/framer-motion)
 *  - testIdAttribute padronizado em "data-testid"
 *
 * Comandos:
 *   npm run test:e2e          # headless (default)
 *   npm run test:e2e:ui       # modo visual
 *   npm run test:e2e:headed   # browser visível
 *   npm run test:e2e:debug    # com inspector
 *   npm run test:e2e:report   # abre o relatório HTML
 *
 * Envs:
 *   E2E_BASE_URL    URL do servidor já rodando (pula webServer)
 *   E2E_PORT        porta do servidor local gerenciado (default 8080)
 *   E2E_HEADLESS    "false" para forçar headed; default true
 *   E2E_RETRIES     número absoluto de retries (sobrescreve CI/local)
 */
import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_STATE = path.resolve(__dirname, "e2e/.auth/storageState.json");
const ARTIFACTS_DIR = path.resolve(__dirname, "e2e-artifacts");
const LOCAL_PORT = Math.max(1, Number.parseInt(process.env.E2E_PORT ?? "8080", 10) || 8080);
const LOCAL_URL = `http://127.0.0.1:${LOCAL_PORT}`;

const HEADLESS = process.env.E2E_HEADLESS
  ? process.env.E2E_HEADLESS.toLowerCase() !== "false"
  : true;

const RETRIES = process.env.E2E_RETRIES
  ? Math.max(0, Number.parseInt(process.env.E2E_RETRIES, 10) || 0)
  : process.env.CI
    ? 2
    : 1;

const HAS_E2E_USER = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const AUTHENTICATED_FLOW_IGNORE = HAS_E2E_USER
  ? [/flows\/20-all-features-smoke\.spec\.ts/]
  : [/flows\//];
const AUTHENTICATED_ROUTE_IGNORE = HAS_E2E_USER ? [] : [/./];
const INTEGRATION_SPECS = [
  /admin-conexoes-credentials-active-products\.spec\.ts/,
  /admin-conexoes-zone-collapse\.spec\.ts/,
  /admin-verbas-audit\.spec\.ts/,
  /audit-validation\.spec\.ts/,
  /critical-flows\/.*\.spec\.ts/,
  /discount-approval\.spec\.ts/,
  /editor-permissions\.spec\.ts/,
  /matrix-automated\.spec\.ts/,
  /mockup-generate\.spec\.ts/,
  /onboarding-tour\.spec\.ts/,
  /order-status-rbac\.spec\.ts/,
  /rbac-navigation\.spec\.ts/,
  /search-stability\.spec\.ts/,
];

export default defineConfig({
  testDir: "./e2e",
  globalSetup: path.resolve(__dirname, "e2e/global-setup.ts"),
  globalTeardown: path.resolve(__dirname, "e2e/global-teardown.ts"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: RETRIES,
  workers: process.env.CI ? 1 : undefined,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  outputDir: ARTIFACTS_DIR,
  // JSON reporter sempre emitido para alimentar `scripts/e2e-feature-summary.mjs`
  // (overhead desprezível). HTML aberto on-demand via `npm run test:e2e:report`.
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["json", { outputFile: "playwright-report/results.json" }],
        ["junit", { outputFile: "playwright-report/results.xml" }],
      ]
    : [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["json", { outputFile: "playwright-report/results.json" }],
      ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? LOCAL_URL,
    headless: HEADLESS,
    testIdAttribute: "data-testid",
    // Evita gravar centenas de MB nos casos aprovados. Em caso de falha, a
    // primeira repetição ainda registra vídeo e trace, enquanto a captura de
    // tela é produzida imediatamente pela tentativa que falhou.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    reducedMotion: "reduce",
    launchOptions: {
      args: ["--disable-blink-features=AutomationControlled"],
    },
  },
  // ───────────────────────────────────────────────────────────
  // ISOLAMENTO @smoke (defesa em profundidade)
  //
  // Apenas o project `chromium-smoke` executa testes marcados `@smoke`.
  // Demais projects aplicam `grepInvert: /@smoke/` para ignorar qualquer
  // `@smoke` que vaze para outro arquivo (ex.: alguém adicionar
  // `test.describe("@smoke ...")` num spec de regression por engano).
  //
  // Combinado com `testMatch`/`testIgnore` por path, isso garante 3 camadas:
  //   1. Path-based: smoke spec só casa em `chromium-smoke`.
  //   2. Tag-based:  qualquer `@smoke` em outro spec é silenciosamente
  //                  pulado em todos os outros projects.
  //   3. Comando:    `npm run test:e2e` (geral) NÃO inclui chromium-smoke
  //                  por padrão — vide `npm run test:e2e:all` para encadear.
  // ───────────────────────────────────────────────────────────
  projects: [
    {
      name: "setup",
      testMatch: /fixtures\/auth\.setup\.ts/,
    },
    {
      name: "chromium-public",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/fixtures\/auth\.setup\.ts/, /flows\//, /routes\//, ...INTEGRATION_SPECS],
      grepInvert: /@smoke/,
    },
    {
      // Integrações e papéis só são válidos quando a CI possui uma conta E2E.
      name: "chromium-integration",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
      testMatch: INTEGRATION_SPECS,
      testIgnore: AUTHENTICATED_ROUTE_IGNORE,
      grepInvert: /@smoke/,
    },
    {
      name: "chromium-authed",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
      testMatch: /flows\/.*\.spec\.ts/,
      // Smoke roda no project dedicado abaixo (chromium-smoke) para evitar
      // execução duplicada e garantir ordem sequencial determinística.
      testIgnore: AUTHENTICATED_FLOW_IGNORE,
      grepInvert: /@smoke/,
    },
    {
      // Smoke gate — 1 teste por funcionalidade, ordem fixa, workers=1.
      // SEM retries: gate determinístico — flakiness deve falhar visível.
      // Executar isoladamente: `npm run test:e2e:smoke` ou
      // `npx playwright test --project=chromium-smoke --max-failures=3`.
      name: "chromium-smoke",
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
        // Captura forçada por teste em falhas — independente do default global.
        // Garante diagnóstico visual completo no CI sem depender de retries.
        screenshot: { mode: "only-on-failure", fullPage: true },
        video: { mode: "retain-on-failure", size: { width: 1280, height: 720 } },
        trace: "retain-on-failure",
      },
      dependencies: ["setup"],
      testMatch: /flows\/20-all-features-smoke\.spec\.ts/,
      // Exige tag @smoke explícita — qualquer test() sem a tag no
      // describe é ignorado, mesmo no spec do smoke. Garante que apenas
      // testes intencionalmente marcados @smoke rodem aqui.
      grep: /@smoke/,
      fullyParallel: false,
      workers: 1,
      retries: 0,
    },
    {
      // Specs por rota — área pública (sem auth). Ex.: routes/public/*.spec.ts
      name: "routes-public",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /routes\/public\/.*\.spec\.ts/,
      grepInvert: /@smoke/,
    },
    {
      // Specs por rota — áreas autenticadas (app, quotes, admin).
      name: "routes-authed",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
      testMatch: /routes\/(app|quotes|admin)\/.*\.spec\.ts/,
      testIgnore: AUTHENTICATED_ROUTE_IGNORE,
      grepInvert: /@smoke/,
    },
    {
      // Sem credenciais, as rotas protegidas ainda precisam bloquear a sessão ausente.
      name: "routes-guards",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /routes\/(app|quotes|admin)\/.*\.spec\.ts/,
      grep: /auth guard:/,
      grepInvert: /@smoke/,
    },
    {
      // Versão mobile dos mesmos specs (apenas testes marcados @mobile rodam aqui).
      name: "routes-mobile",
      use: { ...devices["iPhone 13"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
      testMatch: /routes\/(app|quotes|admin)\/.*\.spec\.ts/,
      testIgnore: AUTHENTICATED_ROUTE_IGNORE,
      grep: /@mobile/,
      grepInvert: /@smoke/,
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Exporta a configuração pública versionada antes do Vite dev. Usar
        // `--mode production` ativaria Service Worker durante os testes.
        command: `bash -c 'if [[ -f .env.production ]]; then set -a; source .env.production; set +a; fi; exec npm run dev -- --host 127.0.0.1 --port ${LOCAL_PORT}'`,
        url: LOCAL_URL,
        // Reusar uma porta sem checar sua origem permitia executar a regressão
        // contra outro projeto local. Use E2E_BASE_URL para um servidor já validado.
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
