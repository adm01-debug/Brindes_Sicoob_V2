import assert from "node:assert/strict";
import test from "node:test";
import { validateSupabaseTarget } from "./validate-supabase-target.mjs";

test("aceita URL HTTPS cujo host corresponde ao projeto isolado", () => {
  assert.equal(
    validateSupabaseTarget("https://staging-123.supabase.co", "staging-123"),
    null,
  );
});

test("rejeita os projetos canônicos conhecidos", () => {
  assert.equal(
    validateSupabaseTarget(
      "https://cfmzkthhgliqelozlmwu.supabase.co",
      "cfmzkthhgliqelozlmwu",
    ),
    "canonical_project",
  );
});

test("rejeita URL que não corresponde ao project ref", () => {
  assert.equal(
    validateSupabaseTarget("https://outro.supabase.co", "staging-123"),
    "project_ref_mismatch",
  );
});

test("rejeita URL sem HTTPS, inválida ou sem destino", () => {
  assert.equal(
    validateSupabaseTarget("http://staging-123.supabase.co", "staging-123"),
    "project_ref_mismatch",
  );
  assert.equal(validateSupabaseTarget("nao-e-url", "staging-123"), "invalid_url");
  assert.equal(validateSupabaseTarget("https://staging-123.supabase.co", ""), "missing_target");
});
