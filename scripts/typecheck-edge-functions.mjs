#!/usr/bin/env node
/**
 * Typecheck all Supabase Edge Functions using `deno check`.
 *
 * - Iterates every `supabase/functions/<fn>/index.ts` (skips `_shared`).
 * - Also typechecks any `*.test.ts` files in each function folder.
 * - Aggregates errors and exits with code 1 if any TS error is detected,
 *   so CI fails on regressions similar to past issues
 *   (e.g. unsafe casts of GenericStringError, wrong SupabaseClient generics).
 *
 * Usage:
 *   node scripts/typecheck-edge-functions.mjs              # all functions
 *   node scripts/typecheck-edge-functions.mjs fn1 fn2      # subset
 *
 * Requires: `deno` available on PATH (installed in the CI job).
 */

import { spawnSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const FUNCTIONS_DIR = "supabase/functions";
const SKIP = new Set(["_shared"]);

function listFunctions() {
  const entries = readdirSync(FUNCTIONS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !SKIP.has(e.name))
    .map((e) => e.name)
    .sort();
}

function listFilesToCheck(fnDir) {
  const files = [];
  const indexFile = join(fnDir, "index.ts");
  if (existsSync(indexFile)) files.push(indexFile);

  // Include co-located test files so we catch type drift in tests too.
  for (const entry of readdirSync(fnDir)) {
    if (entry === "index.ts") continue;
    if (!entry.endsWith(".ts")) continue;
    const full = join(fnDir, entry);
    if (statSync(full).isFile()) files.push(full);
  }
  return files;
}

function ensureDeno() {
  const probe = spawnSync("deno", ["--version"], { encoding: "utf8" });
  if (probe.status !== 0) {
    console.error(
      "❌ `deno` is not available on PATH. Install it before running this script.",
    );
    process.exit(2);
  }
  console.log(probe.stdout.trim().split("\n")[0]);
}

function checkFunction(fn) {
  const fnDir = join(FUNCTIONS_DIR, fn);
  const files = listFilesToCheck(fnDir);
  if (files.length === 0) {
    return { fn, status: "skipped", files: [], output: "" };
  }

  // `deno check` is the dedicated typecheck command. It's faster than
  // `deno cache` and doesn't execute code. We pass all files at once so
  // shared types within the function are resolved together.
  //
  // If the function has a local deno.json (with import map for npm:/jsr:
  // bare specifiers), pass it via --config so imports like
  // `import { Hono } from "hono"` resolve. Without this, bare specifiers
  // fail with: Relative import path "X" not prefixed with / or ./ or ../
  const localConfig = join(fnDir, "deno.json");
  const args = ["check"];
  if (existsSync(localConfig)) args.push("--config", localConfig);
  args.push(...files);

  const result = spawnSync("deno", args, {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });

  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  const status = result.status === 0 ? "ok" : "error";
  return { fn, status, files, output };
}

function main() {
  ensureDeno();

  const requested = process.argv.slice(2);
  const unknown = requested.filter((fn) => !existsSync(join(FUNCTIONS_DIR, fn, "index.ts")));
  if (unknown.length > 0) {
    // Função pedida sem index.ts (nome errado, só index.tsx) virava "skipped" e "All N typecheck cleanly".
    console.error(`❌ Função(ões) sem index.ts em ${FUNCTIONS_DIR}: ${unknown.join(", ")}`);
    process.exit(2);
  }
  const fns = requested.length > 0 ? requested : listFunctions();
  console.log(`\n🔎 Typechecking ${fns.length} edge function(s)...\n`);

  const results = [];
  for (const fn of fns) {
    process.stdout.write(`  • ${fn} ... `);
    const r = checkFunction(fn);
    results.push(r);
    if (r.status === "ok") console.log("✅");
    else if (r.status === "skipped") console.log("⏭️  (no .ts files)");
    else console.log("❌");
  }

  const failed = results.filter((r) => r.status === "error");

  if (failed.length > 0) {
    console.log(`\n──────── ${failed.length} function(s) with TS errors ────────\n`);
    for (const r of failed) {
      console.log(`\n### ${r.fn}`);
      console.log(`Files: ${r.files.join(", ")}`);
      console.log(r.output || "(no output)");
    }
    console.log(
      `\n❌ Edge functions typecheck failed: ${failed.length}/${results.length} function(s) have TS errors.`,
    );
    process.exit(1);
  }

  const skipped = results.filter((r) => r.status === "skipped").length;
  console.log(
    `\n✅ ${results.length - skipped}/${results.length} edge function(s) typecheck cleanly` +
      (skipped > 0 ? ` (${skipped} sem arquivos .ts, não verificada(s)).` : "."),
  );
}

main();
