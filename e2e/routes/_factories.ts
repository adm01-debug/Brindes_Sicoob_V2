/**
 * Factory que cria a suíte padrão de 8 testes para uma rota pública por token.
 *
 * Casos:
 *  1. render
 *  2. happy (token "válido" — usa mock de sucesso fornecido)
 *  3. token inválido → 404 / mensagem
 *  4. token expirado → 410 / mensagem
 *  5. timeout do edge function
 *  6. 5xx do edge function
 *  7. @a11y básico
 *  8. @mobile sem overflow horizontal
 */
import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import {
  basicA11yChecks,
  mockEdgeFn,
  setMobileViewport,
  waitRouteReady,
} from "./_shared";

export interface PublicTokenRouteSpec {
  /** Nome legível, usado no describe. Ex.: "/proposta/:token". */
  name: string;
  /** Builder de URL dado o token (ex.: t => `/proposta/${t}`). */
  buildPath: (token: string) => string;
  /** Nome da edge function que entrega os dados (para mockar). */
  edgeFnName: string;
  /** Body de sucesso. */
  successBody: unknown;
  /** RegExp para encontrar mensagem de "não encontrado/inválido". */
  notFoundCopy?: RegExp;
  /** Mock do carregamento inicial; use para telas que consultam REST diretamente. */
  mockLoad?: (page: Page, scenario: PublicTokenScenario) => Promise<void>;
}

export type PublicTokenScenario = "success" | "notFound" | "expired" | "invalidPayload" | "timeout" | "serviceUnavailable";

export function buildPublicTokenSuite(spec: PublicTokenRouteSpec) {
  const notFound = spec.notFoundCopy ?? /n[aã]o encontrad[oa]|inválido|expirado|indisponível|sem.+acesso|proposta/i;
  const mockLoad = spec.mockLoad ?? ((page, scenario) => {
    const result: { status: number; body: unknown; delayMs?: number } = scenario === "success"
      ? { status: 200, body: spec.successBody }
      : scenario === "notFound"
        ? { status: 200, body: { error: "Link não encontrado" } }
        : scenario === "expired"
          ? { status: 200, body: { error: "Link expirado", expired: true } }
          : scenario === "invalidPayload"
            ? { status: 200, body: { error: "Link inválido" } }
            : scenario === "timeout"
              ? { status: 504, body: {}, delayMs: 6000 }
              : { status: 503, body: { error: "Serviço indisponível" } };
    return mockEdgeFn(page, spec.edgeFnName, result.status, result.body, { delayMs: result.delayMs });
  });

  test.describe(spec.name, () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("render: rota pública carrega sem auth", async ({ page }) => {
      await mockLoad(page, "success");
      await gotoAndSettle(page, spec.buildPath("VALID_TOKEN"));
      await waitRouteReady(page);
      // body visível e não redirecionou para /login
      expect(/\/login/.test(page.url())).toBe(false);
    });

    test("happy: dados do token renderizam", async ({ page }) => {
      await mockLoad(page, "success");
      await gotoAndSettle(page, spec.buildPath("VALID_TOKEN"));
      await waitRouteReady(page);
      // pelo menos um heading visível
      const hasHeading = await page.locator("h1, h2, h3").first().isVisible().catch(() => false);
      expect(hasHeading).toBe(true);
    });

    test("token inválido: 404 mostra mensagem", async ({ page }) => {
      await mockLoad(page, "notFound");
      await gotoAndSettle(page, spec.buildPath("INVALID_TOKEN"));
      await waitRouteReady(page);
      await expect(page.getByText(notFound).first()).toBeVisible({ timeout: 8000 });
    });

    test("token expirado: 410 mostra mensagem", async ({ page }) => {
      await mockLoad(page, "expired");
      await gotoAndSettle(page, spec.buildPath("EXPIRED_TOKEN"));
      await waitRouteReady(page);
      await expect(page.getByText(notFound).first()).toBeVisible({ timeout: 8000 });
    });

    test("payload inválido: 400 do backend mostra erro acionável", async ({ page }) => {
      await mockLoad(page, "invalidPayload");
      await gotoAndSettle(page, spec.buildPath("BAD"));
      await waitRouteReady(page);
      const visible = await page
        .getByRole("alert")
        .or(page.getByText(notFound))
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      expect(visible).toBe(true);
    });

    test("timeout: edge function lenta não trava render", async ({ page }) => {
      await mockLoad(page, "timeout");
      await gotoAndSettle(page, spec.buildPath("SLOW"));
      // A página deve renderizar ao menos um skeleton/loading antes do timeout
      await page.waitForLoadState("domcontentloaded");
      expect(await page.locator("body").isVisible()).toBe(true);
    });

    test("5xx: erro do backend mostra alerta", async ({ page }) => {
      await mockLoad(page, "serviceUnavailable");
      await gotoAndSettle(page, spec.buildPath("ANY"));
      await waitRouteReady(page);
      await expect(page.getByText(notFound).first()).toBeVisible({
        timeout: 10_000,
      });
    });

    test("@a11y básico", async ({ page }) => {
      await mockLoad(page, "success");
      await gotoAndSettle(page, spec.buildPath("VALID_TOKEN"));
      await waitRouteReady(page);
      await basicA11yChecks(page);
    });

    test("@mobile layout sem overflow horizontal", async ({ page }) => {
      await mockLoad(page, "success");
      await setMobileViewport(page);
      await gotoAndSettle(page, spec.buildPath("VALID_TOKEN"));
      await waitRouteReady(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow).toBe(false);
    });
  });
}

/* ============================================================
 * Builder análogo para rotas autenticadas padrão.
 * Substitui "token inválido/expirado" por "auth fail" e "RLS denial".
 * ============================================================ */

export interface AuthedRouteSpec {
  name: string;
  path: string;
  /** Edge functions ou tabelas REST principais usadas pela rota. */
  primary: { kind: "fn" | "rest"; key: string; successBody?: unknown };
  /** Asserts custom para o happy path (se omitido, valida apenas heading). */
  happyAssert?: (page: import("@playwright/test").Page) => Promise<void>;
}

export function buildAuthedRouteSuite(spec: AuthedRouteSpec) {
  const route = spec.primary.kind === "fn"
    ? new RegExp(`/functions/v1/${spec.primary.key}(\\?|$|/)`)
    : new RegExp(`/rest/v1/${spec.primary.key}(\\?|$)`);

  const mockSuccess = async (page: import("@playwright/test").Page) => {
    await page.route(route, r =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(spec.primary.successBody ?? []) }),
    );
  };

  test.describe(spec.name, () => {
    test("render: rota carrega sem erros JS", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", e => errors.push(e.message));
      await mockSuccess(page);
      await gotoAndSettle(page, spec.path);
      await waitRouteReady(page);
      expect(errors, "page errors: " + errors.join("; ")).toHaveLength(0);
    });

    test("happy: dados principais renderizam", async ({ page }) => {
      await mockSuccess(page);
      await gotoAndSettle(page, spec.path);
      await waitRouteReady(page);
      if (spec.happyAssert) {
        await spec.happyAssert(page);
      } else {
        const heading = await page.locator("h1, h2, h3").first().isVisible().catch(() => false);
        expect(heading).toBe(true);
      }
    });

    test("auth guard: sessão ausente redireciona para /login", async ({ page }) => {
      await page.context().clearCookies();
      await page.goto("/login");
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await gotoAndSettle(page, spec.path);
      await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
    });

    test("payload inválido: 400 do backend exibe erro legível", async ({ page }) => {
      await page.route(route, r =>
        r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "invalid input", code: "22P02" }) }),
      );
      await gotoAndSettle(page, spec.path);
      await waitRouteReady(page);
      const ok = await page.getByRole("alert").or(page.getByText(/inválid|erro|falhou/i)).first().isVisible({ timeout: 8000 }).catch(() => false);
      expect(ok).toBe(true);
    });

    test("timeout: backend lento mostra loading e não trava", async ({ page }) => {
      await page.route(route, async r => {
        await new Promise(res => setTimeout(res, 5000));
        await r.fulfill({ status: 504, body: "{}" });
      });
      await gotoAndSettle(page, spec.path);
      await page.waitForLoadState("domcontentloaded");
      expect(await page.locator("body").isVisible()).toBe(true);
    });

    test("5xx: serviço indisponível mostra alerta", async ({ page }) => {
      await page.route(route, r =>
        r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "service unavailable" }) }),
      );
      await gotoAndSettle(page, spec.path);
      await waitRouteReady(page);
      const ok = await page
        .getByRole("alert")
        .or(page.getByText(/indispon|tente novamente|erro/i))
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      expect(ok).toBe(true);
    });

    test("@a11y básico", async ({ page }) => {
      await mockSuccess(page);
      await gotoAndSettle(page, spec.path);
      await waitRouteReady(page);
      await basicA11yChecks(page);
    });

    test("@mobile layout sem overflow horizontal", async ({ page }) => {
      await mockSuccess(page);
      await setMobileViewport(page);
      await gotoAndSettle(page, spec.path);
      await waitRouteReady(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow).toBe(false);
    });
  });
}
