import { describe, expect, it } from "vitest";
import {
  REQUIRED_EDGE_FUNCTIONS,
  verifyEdgeFunctionDeployments,
} from "../../scripts/verify-edge-function-deploy.mjs";

const before = REQUIRED_EDGE_FUNCTIONS.map((slug) => ({ slug, version: 5, status: "ACTIVE" }));

describe("verificação de publicação de Edge Functions", () => {
  it("aceita no-op idempotente quando as funções continuam ativas na mesma versão", () => {
    const result = verifyEdgeFunctionDeployments(before, before);
    expect(result.ok).toBe(true);
    expect(result.confirmations).toHaveLength(REQUIRED_EDGE_FUNCTIONS.length);
  });

  it("aceita novas versões ativas", () => {
    const current = before.map((fn) => ({ ...fn, version: fn.version + 1 }));
    expect(verifyEdgeFunctionDeployments(before, current).ok).toBe(true);
  });

  it("falha se uma função requerida estiver ausente ou inativa", () => {
    const missing = before.filter((fn) => fn.slug !== "sicoob-reorder");
    const inactive = before.map((fn) => fn.slug === "sicoob-reorder" ? { ...fn, status: "INACTIVE" } : fn);
    expect(verifyEdgeFunctionDeployments(before, missing).ok).toBe(false);
    expect(verifyEdgeFunctionDeployments(before, inactive).ok).toBe(false);
  });

  it("falha com versão inválida ou regressão", () => {
    const invalid = before.map((fn) => fn.slug === "sicoob-reorder" ? { ...fn, version: "n/a" } : fn);
    const regressed = before.map((fn) => fn.slug === "sicoob-reorder" ? { ...fn, version: 4 } : fn);
    expect(verifyEdgeFunctionDeployments(before, invalid).ok).toBe(false);
    expect(verifyEdgeFunctionDeployments(before, regressed).ok).toBe(false);
  });
});
