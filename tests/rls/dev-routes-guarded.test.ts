/**
 * Garantia estrutural: TODA rota técnica (role === "dev" no SSOT
 * `RBAC_ROUTES`) precisa estar declarada dentro do bloco `<DevRoute>`
 * em `src/routes/app-router.tsx`.
 *
 * Se este teste falhar, alguém adicionou uma rota técnica fora do guard
 * — risco de bypass via URL direta. Mover a rota para dentro do bloco
 * `<Route id="dev" element={<DevRoute />}>` no roteador principal.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RBAC_ROUTES } from "@/lib/rbac/route-matrix";
import { devRoutes } from "@/routes/config/dev";

const APP_ROUTER_TSX = resolve(__dirname, "../../src/routes/app-router.tsx");

describe("dev routes are guarded by <DevRoute> no roteador principal", () => {
  const source = readFileSync(APP_ROUTER_TSX, "utf8");
  const devOnlyPaths = RBAC_ROUTES.filter((r) => r.role === "dev").map((r) => r.path);
  const configuredPaths = devRoutes.map((route) => route.path);

  it.each(devOnlyPaths)(
    'rota técnica "%s" está dentro do bloco <DevRoute>',
    (path) => {
      expect(configuredPaths, `Rota técnica ${path} não está em devRoutes`).toContain(path);
    },
  );

  it("o roteador monta exclusivamente devRoutes dentro de DevRoute", () => {
    expect(source).toMatch(
      /<Route id="dev" element=\{<DevRoute \/>\}>[\s\S]*?\{devRoutes\.map\([\s\S]*?<\/Route>/,
    );
    expect(new Set(configuredPaths)).toEqual(new Set(devOnlyPaths));
  });
});
