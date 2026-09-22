#!/usr/bin/env node
/**
 * check-edge-structured-logging.mjs
 * ----------------------------------------------------------------
 * Gate de CI: garante que TODA nova edge function adote o logger
 * estruturado SSOT (`createStructuredLogger`) declarado em
 * `supabase/functions/_shared/structured-logger.ts`.
 *
 * Estratégia:
 *  - Mantém uma allowlist (`LEGACY_ALLOWLIST`) com as edges legadas
 *    que ainda não foram migradas. NÃO acrescentar nada novo aqui.
 *  - Para QUALQUER edge function que NÃO esteja na allowlist o gate
 *    falha se `index.ts` não chamar o logger ou wrapper importado.
 *  - Garante também que a allowlist não cresça (snapshot count).
 *
 * Saída:
 *  - exit 0 → ok.
 *  - exit 1 → violações listadas em stderr.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { hasStructuredLogging, isReviewedInactiveEndpoint } from "./lib/edge-logging-contract.mjs";

const FN_ROOT = "supabase/functions";

// ⚠️  Snapshot tirado em 2026-04-27. NÃO ADICIONAR novas entradas.
// Migrar uma edge para o logger SSOT remove-a daqui.
const LEGACY_ALLOWLIST = new Set([
  "ai-recommendations","analyze-logo-colors","bi-copilot","bi-share-dossier",
  "block-ip-temporarily","categories-api","cleanup-notifications",
  "cleanup-novelties","cnpj-lookup","collections-public-react","collections-watcher",
  "commemorative-dates","comparison-ai-advisor","comparison-price-watcher",
  "comparisons-public-react","connection-tester","connections-auto-test",
  "connections-health-check","connections-hub-audit","crm-db-bridge",
  "detect-new-device","dropbox-list","e2e-cleanup","elevenlabs-scribe-token",
  "elevenlabs-tts","expert-chat","external-db-bridge","external-db-inspect",
  "favorites-public-react","favorites-watcher","force-global-logout",
  "full-op-diagnostics","generate-ad-image","generate-ad-prompt","generate-mockup",
  "generate-mockup-nanobanana","generate-product-seo","get-visitor-info",
  "github-credentials-test","github-fix-config","health-check","image-proxy",
  "kit-ai-builder","kit-identity-suggest","kit-public-view",
  "magic-up-score","manage-users","market-intelligence-insights","materials-api",
  "mcp-keys-issue","mcp-keys-rotate","mcp-keys-update",
  "mcp-server","ownership-audit","ownership-repair","process-queue",
  "process-scheduled-reports","product-webhook","quote-followup-reminders",
  "quote-public-view","rate-limit-check","rls-audit",
  "rls-integration-tests","rls-matrix-export","secrets-manager","semantic-search",
  "send-digest","send-notification","send-scheduled-reports",
  "send-transactional-email","step-up-verify",
  "trends-insights","validate-access","verify-email","visual-search",
  "voice-agent","webhook-dispatcher","webhook-inbound",
]);

const SNAPSHOT_SIZE = 84;

function listEdgeFunctions() {
  return readdirSync(FN_ROOT)
    .filter((name) => !name.startsWith("_"))
    .filter((name) => {
      const p = join(FN_ROOT, name);
      try { return statSync(p).isDirectory() && existsSync(join(p, "index.ts")); } catch { return false; }
    });
}

function indexHasLogger(name) {
  const candidates = ["index.ts", "index.tsx"];
  for (const f of candidates) {
    const p = join(FN_ROOT, name, f);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");
    return hasStructuredLogging(src);
  }
  return false;
}

function main() {
  const fns = listEdgeFunctions();
  const violations = [];
  const inactive = fns.filter(name => isReviewedInactiveEndpoint(name, readFileSync(join(FN_ROOT, name, "index.ts"), "utf8")));
  const instrumented = fns.filter(indexHasLogger);
  const legacy = fns.filter(name => !inactive.includes(name) && !instrumented.includes(name) && LEGACY_ALLOWLIST.has(name));
  const orphanAllowlist = [];

  // 1) novas edges precisam usar o logger
  for (const name of fns) {
    if (LEGACY_ALLOWLIST.has(name) || inactive.includes(name)) continue;
    if (!indexHasLogger(name)) {
      violations.push(name);
    }
  }

  // 2) entradas obsoletas na allowlist (edge removida)
  for (const name of LEGACY_ALLOWLIST) {
    if (!fns.includes(name)) orphanAllowlist.push(name);
  }

  // 3) snapshot growth detection
  const sizeDelta = LEGACY_ALLOWLIST.size - SNAPSHOT_SIZE;

  let exit = 0;
  if (violations.length) {
    console.error("\n❌ Edge functions sem logger estruturado SSOT:");
    for (const v of violations) console.error(`   • ${v}`);
    console.error(
      "\n   → Use createStructuredLogger ou withStructuredLogging de '../_shared/structured-logger.ts'",
    );
    console.error("   → Veja docs/OBSERVABILITY.md §2 para o padrão.\n");
    exit = 1;
  }
  if (orphanAllowlist.length) {
    console.error("\n⚠️  Allowlist contém edges inexistentes (limpe o snapshot):");
    for (const o of orphanAllowlist) console.error(`   • ${o}`);
    exit = 1;
  }
  if (sizeDelta > 0) {
    console.error(
      `\n❌ Allowlist cresceu (${SNAPSHOT_SIZE} → ${LEGACY_ALLOWLIST.size}). ` +
        "Não adicione novas edges à allowlist; use o logger SSOT.",
    );
    exit = 1;
  }
  if (exit === 0) {
    console.log(
      `✅ Edge structured-logging gate OK — ${fns.length} edges (${legacy.length} legadas, ` +
        `${instrumented.length} instrumentadas, ${inactive.length} inerte).`,
    );
  }
  process.exit(exit);
}

main();
