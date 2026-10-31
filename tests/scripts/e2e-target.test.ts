import { describe, expect, it } from "vitest";
import { validateE2ETarget } from "../../scripts/e2e-target.mjs";

const validConfig = {
  url: "https://qa-sicoob-123.supabase.co",
  projectId: "qa-sicoob-123",
  allowedProjectId: "qa-sicoob-123",
  publishableKey: "sb_publishable_qa",
  serviceRoleKey: "sb_secret_qa",
};

describe("guarda de destino E2E", () => {
  it("aceita somente a URL HTTPS do projeto explicitamente permitido", () => {
    expect(validateE2ETarget(validConfig)).toEqual({ projectId: "qa-sicoob-123" });
  });

  it.each([
    ["configuração incompleta", { ...validConfig, serviceRoleKey: "" }],
    ["project ref divergente da URL", { ...validConfig, projectId: "outro-projeto" }],
    ["project ref fora da allowlist", { ...validConfig, allowedProjectId: "outro-projeto" }],
    ["projeto canônico do portal", { ...validConfig, projectId: "cfmzkthhgliqelozlmwu", allowedProjectId: "cfmzkthhgliqelozlmwu", url: "https://cfmzkthhgliqelozlmwu.supabase.co" }],
    ["catálogo mestre", { ...validConfig, projectId: "doufsxqlfjyuvxuezpln", allowedProjectId: "doufsxqlfjyuvxuezpln", url: "https://doufsxqlfjyuvxuezpln.supabase.co" }],
    ["endpoint sem TLS", { ...validConfig, url: "http://qa-sicoob-123.supabase.co" }],
    ["host de projeto diferente", { ...validConfig, url: "https://other.supabase.co" }],
    ["caminho alternativo", { ...validConfig, url: "https://qa-sicoob-123.supabase.co/proxy" }],
    ["porta customizada", { ...validConfig, url: "https://qa-sicoob-123.supabase.co:8443" }],
    ["chaves repetidas", { ...validConfig, serviceRoleKey: validConfig.publishableKey }],
  ])("rejeita %s", (_reason, config) => {
    expect(() => validateE2ETarget(config)).toThrow();
  });
});
