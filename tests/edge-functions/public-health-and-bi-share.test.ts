import { describe, expect, it } from "vitest";
import { createLivenessResponse } from "../../supabase/functions/health-check/contract";
import {
  createBiShareUnavailableResponse,
  resolveBiShareSecret,
} from "../../supabase/functions/bi-share-dossier/contract";

describe("contratos das Edge Functions públicas", () => {
  it("health-check responde liveness sem depender de serviços internos", async () => {
    const response = createLivenessResponse(new Request("https://edge.test/health-check"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("health-check aceita preflight e recusa métodos que não são de leitura", () => {
    const preflight = createLivenessResponse(new Request("https://edge.test/health-check", { method: "OPTIONS" }));
    const mutation = createLivenessResponse(new Request("https://edge.test/health-check", { method: "POST" }));

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
    expect(mutation.status).toBe(405);
    expect(mutation.headers.get("allow")).toBe("GET, OPTIONS");
  });

  it("não usa a service role como fallback HMAC e falha fechada sem segredo próprio", async () => {
    expect(resolveBiShareSecret({ SUPABASE_SERVICE_ROLE_KEY: "service-role-secret" })).toBeNull();
    expect(resolveBiShareSecret({ BI_SHARE_SECRET: "   ", SUPABASE_SERVICE_ROLE_KEY: "service-role-secret" })).toBeNull();
    expect(resolveBiShareSecret({ BI_SHARE_SECRET: " dedicated-secret ", SUPABASE_SERVICE_ROLE_KEY: "other" })).toBe("dedicated-secret");

    const response = createBiShareUnavailableResponse({ "Access-Control-Allow-Origin": "https://app.test" });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Service unavailable" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
