import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateE2ESupabaseTarget } from "../../scripts/qa/validate-e2e-project.mjs";

const STAGING_ID = "qwertyuiopasdfghjklz";
const GUARD_SCRIPT = path.resolve("scripts/qa/validate-e2e-project.mjs");

describe("validateE2ESupabaseTarget", () => {
  it("aceita URL HTTPS exatamente correspondente ao projeto de homologação autorizado", () => {
    expect(validateE2ESupabaseTarget({
      url: `https://${STAGING_ID}.supabase.co`,
      projectId: STAGING_ID,
      expectedProjectId: STAGING_ID,
    })).toBeNull();
  });

  it.each([
    ["banco canônico", "cfmzkthhgliqelozlmwu"],
    ["banco de catálogo", "doufsxqlfjyuvxuezpln"],
  ])("rejeita %s antes de qualquer teste remoto", (_label, projectId) => {
    expect(validateE2ESupabaseTarget({
      url: `https://${projectId}.supabase.co`,
      projectId,
      expectedProjectId: STAGING_ID,
    })).toMatch(/projetos Supabase protegidos/);
  });

  it("exige os três valores de destino", () => {
    expect(validateE2ESupabaseTarget({ url: "", projectId: STAGING_ID, expectedProjectId: STAGING_ID }))
      .toMatch(/Configure URL/);
  });

  it("rejeita project ref fora do formato esperado", () => {
    expect(validateE2ESupabaseTarget({
      url: "https://staging.supabase.co",
      projectId: "staging",
      expectedProjectId: STAGING_ID,
    })).toMatch(/formato Supabase válido/);
  });

  it("rejeita ref diferente do projeto autorizado", () => {
    expect(validateE2ESupabaseTarget({
      url: `https://${STAGING_ID}.supabase.co`,
      projectId: STAGING_ID,
      expectedProjectId: "zxcvbnmasdfghjklqwer",
    })).toMatch(/não corresponde ao projeto de homologação/);
  });

  it.each([
    ["HTTP", `http://${STAGING_ID}.supabase.co`],
    ["outro host", "https://example.supabase.co"],
    ["caminho adicional", `https://${STAGING_ID}.supabase.co/rest/v1`],
    ["query string", `https://${STAGING_ID}.supabase.co?redirect=/`],
  ])("rejeita URL insegura ou divergente (%s)", (_label, url) => {
    expect(validateE2ESupabaseTarget({ url, projectId: STAGING_ID, expectedProjectId: STAGING_ID }))
      .toMatch(/não corresponde ao projeto de homologação/);
  });

  it("executa o guard antes da primeira chamada com autorização remota", () => {
    const workflow = readFileSync(".github/workflows/e2e.yml", "utf8");
    const guardIndex = workflow.indexOf("Validar alvo Supabase segregado para E2E");
    const remoteTestIndex = workflow.indexOf("Validar autorização remota e RLS técnico");

    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(remoteTestIndex).toBeGreaterThan(guardIndex);
    expect(workflow).toContain("E2E_SUPABASE_PROJECT_ID: ${{ vars.E2E_SUPABASE_PROJECT_ID }}");
    expect(workflow).toContain("node scripts/qa/validate-e2e-project.mjs");
  });

  it("CLI retorna sucesso para o destino de homologação validado", () => {
    const result = spawnSync(process.execPath, [GUARD_SCRIPT], {
      encoding: "utf8",
      env: {
        ...process.env,
        VITE_SUPABASE_URL: `https://${STAGING_ID}.supabase.co`,
        VITE_SUPABASE_PROJECT_ID: STAGING_ID,
        E2E_SUPABASE_PROJECT_ID: STAGING_ID,
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/homologação validado/);
  });

  it("CLI falha sem expor URL ou ref do banco protegido", () => {
    const protectedId = "cfmzkthhgliqelozlmwu";
    const protectedUrl = `https://${protectedId}.supabase.co`;
    const result = spawnSync(process.execPath, [GUARD_SCRIPT], {
      encoding: "utf8",
      env: {
        ...process.env,
        VITE_SUPABASE_URL: protectedUrl,
        VITE_SUPABASE_PROJECT_ID: protectedId,
        E2E_SUPABASE_PROJECT_ID: protectedId,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/projetos Supabase protegidos/);
    expect(result.stderr).not.toContain(protectedId);
    expect(result.stderr).not.toContain(protectedUrl);
  });
});
