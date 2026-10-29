#!/usr/bin/env node
/**
 * Smoke tests rápidos para o pipeline de CI.
 *
 * Objetivo: detectar quebras críticas em <30s antes de rodar a suíte completa.
 *
 * Verifica:
 *  1. Build estático: rotas críticas declaradas em src/App.tsx existem nos arquivos esperados
 *  2. Health-check: edge function /health-check responde (se BASE_URL fornecida)
 *  3. Rotas públicas: HEAD em /login, / (published URL) responde <2s sem 5xx
 *
 * Variáveis (todas opcionais — degrada graciosamente):
 *   SMOKE_BASE_URL          ex: https://promogifts.com.br (default: pula HTTP)
 *   SMOKE_HEALTH_FN_URL     ex: https://<project>.functions.supabase.co/health-check
 *   SMOKE_TIMEOUT_MS        default: 5000
 *   SMOKE_FAIL_ON_DEGRADED  "1" para tratar degraded como falha (default: não)
 *
 * Saída: exit 0 se OK, exit 1 se algum check crítico falhar.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createHealthcheckRequestOptions,
  isHealthcheckSuccessful,
} from "./health-check-contract.mjs";

const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 5000);
const BASE_URL = process.env.SMOKE_BASE_URL?.replace(/\/$/, "");
const HEALTH_FN_URL = process.env.SMOKE_HEALTH_FN_URL;
const FAIL_ON_DEGRADED = process.env.SMOKE_FAIL_ON_DEGRADED === "1";

// Rotas públicas (acessíveis sem login) — usadas para HEAD se BASE_URL fornecida
const PUBLIC_ROUTES = ["/login", "/reset-password"];

// Rotas declaradas obrigatórias em App.tsx (asserção estática, sempre roda)
const REQUIRED_ROUTES = [
  "/login",
  "/reset-password",
  "/approve/:token",
  "/proposta/:token",
  "/kit/:token",
  "/lista-publica/:token",
  "/colecao-publica/:token",
  "/comparar-publica/:token",
  "/dossie/:token",
  "/auth/callback",
  "/produtos",
  "/orcamentos",
  "/orcamentos/novo",
  "/admin/usuarios",
];

const results = [];
let hasCritical = false;

function log(level, name, message, meta = {}) {
  const icon = level === "ok" ? "✓" : level === "warn" ? "⚠" : "✗";
  const color = level === "ok" ? "\x1b[32m" : level === "warn" ? "\x1b[33m" : "\x1b[31m";
  const reset = "\x1b[0m";
  console.log(`${color}${icon}${reset} ${name}: ${message}`);
  results.push({ level, name, message, ...meta });
  if (level === "fail") hasCritical = true;
}

async function withTimeout(promise, ms, label) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await promise(ctrl.signal);
  } catch (e) {
    if (e.name === "AbortError") throw new Error(`timeout >${ms}ms (${label})`);
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// ============================================================
// Check 1: rotas declaradas estaticamente em src/App.tsx
// ============================================================
function checkStaticRoutes() {
  const appPath = resolve(process.cwd(), "src/App.tsx");
  if (!existsSync(appPath)) {
    log("fail", "static-routes", "src/App.tsx não encontrado");
    return;
  }
  const src = readFileSync(appPath, "utf8");
  const missing = REQUIRED_ROUTES.filter((r) => !src.includes(`path="${r}"`));
  if (missing.length === 0) {
    log("ok", "static-routes", `${REQUIRED_ROUTES.length} rotas críticas declaradas`);
  } else {
    log("fail", "static-routes", `rotas ausentes: ${missing.join(", ")}`, { missing });
  }
}

// ============================================================
// Check 2: edge function health-check
// ============================================================
async function checkHealthFunction() {
  if (!HEALTH_FN_URL) {
    log("warn", "health-fn", "SMOKE_HEALTH_FN_URL não configurada — pulando");
    return;
  }
  try {
    const start = Date.now();
    const res = await withTimeout(
      (signal) =>
        fetch(HEALTH_FN_URL, {
          ...createHealthcheckRequestOptions(),
          signal,
        }),
      TIMEOUT_MS,
      "health-fn",
    );
    const latency = Date.now() - start;
    const body = await res.json().catch(() => ({}));
    const status = body.status ?? "unknown";

    if (isHealthcheckSuccessful(res.ok, status)) {
      log("ok", "health-fn", `${status} em ${latency}ms`, { status, latency, body });
    } else if (status === "degraded") {
      log(
        FAIL_ON_DEGRADED ? "fail" : "warn",
        "health-fn",
        `degraded em ${latency}ms — checks: ${JSON.stringify(body.checks ?? {})}`,
        { status, latency, body },
      );
    } else {
      log("fail", "health-fn", `unhealthy (${res.status}) — ${JSON.stringify(body)}`, {
        status,
        latency,
        body,
      });
    }
  } catch (e) {
    log("fail", "health-fn", `erro: ${e.message}`);
  }
}

// ============================================================
// Check 3: HEAD em rotas públicas
// ============================================================
async function checkPublicRoutes() {
  if (!BASE_URL) {
    log("warn", "public-routes", "SMOKE_BASE_URL não configurada — pulando HTTP");
    return;
  }
  for (const route of PUBLIC_ROUTES) {
    const url = `${BASE_URL}${route}`;
    try {
      const start = Date.now();
      const res = await withTimeout(
        (signal) =>
          fetch(url, {
            signal,
            method: "GET",
            redirect: "manual",
            headers: { "user-agent": "promogifts-ci-smoke/1.0" },
          }),
        TIMEOUT_MS,
        `route ${route}`,
      );
      const latency = Date.now() - start;
      // 2xx, 3xx ou 401 são OK (SPA serve index, auth pode redirecionar)
      if (res.status >= 500) {
        log("fail", `route ${route}`, `${res.status} em ${latency}ms`, { status: res.status, latency });
      } else if (latency > 3000) {
        log("warn", `route ${route}`, `${res.status} mas lento (${latency}ms)`, {
          status: res.status,
          latency,
        });
      } else {
        log("ok", `route ${route}`, `${res.status} em ${latency}ms`);
      }
    } catch (e) {
      log("fail", `route ${route}`, `erro: ${e.message}`);
    }
  }
}

// ============================================================
// Run
// ============================================================
(async () => {
  console.log("\n🔬 Smoke tests — Promo Gifts CI\n");
  const t0 = Date.now();

  checkStaticRoutes();
  await checkHealthFunction();
  await checkPublicRoutes();

  const elapsed = Date.now() - t0;
  const passed = results.filter((r) => r.level === "ok").length;
  const warned = results.filter((r) => r.level === "warn").length;
  const failed = results.filter((r) => r.level === "fail").length;

  console.log(
    `\n${hasCritical ? "✗" : "✓"} Smoke tests finalizados em ${elapsed}ms — ` +
      `${passed} ok / ${warned} warn / ${failed} fail`,
  );

  if (hasCritical) {
    console.error("\n❌ Falha crítica em smoke tests — bloqueando pipeline.\n");
    process.exit(1);
  }
})();
