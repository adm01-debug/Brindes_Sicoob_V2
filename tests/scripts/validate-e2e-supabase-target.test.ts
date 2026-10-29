import { describe, expect, it } from "vitest";
import { validateE2eSupabaseTarget } from "../../scripts/validate-e2e-supabase-target.mjs";

const validEnvironment = {
  E2E_SUPABASE_URL: "https://isolated-staging.supabase.co",
  E2E_SUPABASE_PROJECT_ID: "isolated-staging",
  E2E_SUPABASE_PUBLISHABLE_KEY: "publishable-test-value",
  E2E_SUPABASE_SERVICE_ROLE_KEY: "service-role-test-value",
  E2E_SUPABASE_CLEANUP_TOKEN: "cleanup-test-value",
};

describe("validateE2eSupabaseTarget", () => {
  it("accepts a dedicated HTTPS Supabase project", () => {
    expect(validateE2eSupabaseTarget(validEnvironment)).toBeNull();
  });

  it("fails closed when a required staging secret is absent", () => {
    const { E2E_SUPABASE_SERVICE_ROLE_KEY: _, ...environment } = validEnvironment;

    expect(validateE2eSupabaseTarget(environment)).toContain("E2E_SUPABASE_SERVICE_ROLE_KEY");
  });

  it("rejects a URL whose host does not match the configured project ref", () => {
    expect(
      validateE2eSupabaseTarget({
        ...validEnvironment,
        E2E_SUPABASE_URL: "https://another-project.supabase.co",
      }),
    ).toContain("corresponder a E2E_SUPABASE_PROJECT_ID");
  });

  it.each(["cfmzkthhgliqelozlmwu", "doufsxqlfjyuvxuezpln"])(
    "blocks canonical project %s",
    (projectId) => {
      expect(
        validateE2eSupabaseTarget({
          ...validEnvironment,
          E2E_SUPABASE_URL: `https://${projectId}.supabase.co`,
          E2E_SUPABASE_PROJECT_ID: projectId,
        }),
      ).toContain("bloqueado para E2E");
    },
  );

  it("rejects non-HTTPS endpoints", () => {
    expect(
      validateE2eSupabaseTarget({
        ...validEnvironment,
        E2E_SUPABASE_URL: "http://isolated-staging.supabase.co",
      }),
    ).toContain("https://<project-ref>.supabase.co");
  });
});
