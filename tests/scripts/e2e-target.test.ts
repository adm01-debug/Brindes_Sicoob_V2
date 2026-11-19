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
    ...["pgxfvjmuubtbowutlide", "nmojwpihnslkssljowjh", "bojgeppypmtormfjsyun", "hgbzltfwozdkcudofypy"].map((id) => [
      `projeto proibido ${id} (CRM/legado) mesmo na allowlist`,
      { ...validConfig, projectId: id, allowedProjectId: id, url: `https://${id}.supabase.co` },
    ] as const),
    ["endpoint sem TLS", { ...validConfig, url: "http://qa-sicoob-123.supabase.co" }],
    ["host de projeto diferente", { ...validConfig, url: "https://other.supabase.co" }],
    ["caminho alternativo", { ...validConfig, url: "https://qa-sicoob-123.supabase.co/proxy" }],
    ["porta customizada", { ...validConfig, url: "https://qa-sicoob-123.supabase.co:8443" }],
    ["chaves repetidas", { ...validConfig, serviceRoleKey: validConfig.publishableKey }],
    // Recuperados de `tests/scripts/validate-e2e-supabase-target.test.ts`, que
    // ficou em `fix/hermes-bi-share-hardening-20261028` e nunca entrou na
    // `main`. O script já recusa os dois (`scripts/e2e-target.mjs:34` e `:22`);
    // o que faltava era a catraca.
    ["endpoint sem HTTPS", { ...validConfig, url: "http://qa-sicoob-123.supabase.co" }],
  ])("rejeita %s", (_reason, config) => {
    expect(() => validateE2ETarget(config)).toThrow();
  });

  it.each([
    ["url", "url"],
    ["projectId", "projectId"],
    ["allowedProjectId", "allowedProjectId"],
    ["publishableKey", "publishableKey"],
    ["serviceRoleKey", "serviceRoleKey"],
  ])("falha fechado quando falta %s", (_rotulo, campo) => {
    const incompleto: Record<string, unknown> = { ...validConfig };
    delete incompleto[campo];
    expect(() => validateE2ETarget(incompleto as never)).toThrow(
      /Configuração obrigatória do destino E2E ausente\./,
    );
  });
});
