/**
 * E2E — "Logística Onda A" sidebar group:
 *   • Painel Sicoob   → /sicoob/pedidos
 *   • Relatórios      → /sicoob/logistica
 *   • Kanban          → /sicoob/pedidos/kanban
 *
 * Objetivo: caçar gaps de RBAC + UX de acesso negado.
 *
 * Gaps conhecidos que estes testes EXPÕEM (xfail/documentados):
 *   1. Os 3 itens da sidebar aparecem para QUALQUER usuário autenticado,
 *      mas as rotas exigem `gestor_compras` (ou dev). Usuários sem o papel
 *      são redirecionados via <Navigate to="/" /> SEM feedback — o usuário
 *      relata "cliquei e não consegui acessar".
 *   2. O guard usa redirect silencioso para "/" em vez de "/403" como o
 *      irmão `/sicoob/vendas` faz (usa ProtectedRoute → ForbiddenPage).
 *      → comportamento inconsistente; deveria padronizar em /403.
 *
 * Os testes validam o comportamento esperado de redirecionamento para /403 e visibilidade
 * restrita na sidebar.
 */
import { test, expect } from "../../fixtures/test-base";
import { loginAs, logout } from "../../helpers/auth";
import { gotoAndSettle, waitForRouteIdle } from "../../helpers/nav";

const ROUTES = [
  { label: /Painel Sicoob/i, href: "/sicoob/pedidos", title: /Pedidos Sicoob/i },
  { label: /Relatórios/i,    href: "/sicoob/logistica", title: /Painel de Logística/i },
  { label: /Kanban/i,        href: "/sicoob/pedidos/kanban", title: /Funil de Pedidos/i },
] as const;

test.describe("Sicoob • Logística Onda A — acesso anônimo", () => {
  for (const r of ROUTES) {
    test(`anônimo em ${r.href} → redireciona para /login`, async ({ page }) => {
      await logout(page);
      await gotoAndSettle(page, r.href);
      await expect(page).toHaveURL(/\/login(\?|#|$)/);
    });
  }
});

test.describe("Sicoob • Logística Onda A — gestor_compras (acesso permitido)", () => {
  // Usa o role 'admin' do helper, que é mapeado a um usuário com gestor_compras
  // ou dev no ambiente E2E (ver e2e/helpers/auth.ts).
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  for (const r of ROUTES) {
    test(`acessa ${r.href} e renderiza título "${r.title}"`, async ({ page }) => {
      await gotoAndSettle(page, r.href);
      await waitForRouteIdle(page);
      await expect(page).toHaveURL((url) => url.pathname === r.href);
      await expect(page.locator("h1").first()).toContainText(r.title);
    });
  }

  test("sidebar: o grupo 'Logística Onda A' lista os 3 itens", async ({ page }) => {
    await gotoAndSettle(page, "/");
    const group = page.getByRole("button", { name: /Logística Onda A/i }).first();
    if (await group.isVisible()) {
      await group.click().catch(() => { /* pode já estar aberto */ });
    }
    for (const r of ROUTES) {
      await expect(page.getByRole("link", { name: r.label }).first()).toBeVisible();
    }
  });

  test("navegação cruzada: Painel → Kanban → Relatórios mantém autenticação", async ({ page }) => {
    await gotoAndSettle(page, "/sicoob/pedidos");
    await waitForRouteIdle(page);
    await expect(page.locator("h1").first()).toContainText(/Pedidos Sicoob/i);

    await gotoAndSettle(page, "/sicoob/pedidos/kanban");
    await waitForRouteIdle(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("h1").first()).toContainText(/Funil de Pedidos/i);

    await gotoAndSettle(page, "/sicoob/logistica");
    await waitForRouteIdle(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("h1").first()).toContainText(/Painel de Logística/i);
  });
});

test.describe("Sicoob • Logística Onda A — usuário sem 'gestor_compras' (gap RBAC)", () => {
  // Usuário comum (vendedor/agente) — hoje cai em "/" silenciosamente.
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "user");
  });

  for (const r of ROUTES) {
    test(`redireciona ${r.href} para /403 para usuário sem permissão`, async ({ page }) => {
      await gotoAndSettle(page, r.href);
      await waitForRouteIdle(page);

      // Deve redirecionar para /403
      await expect(page).toHaveURL(/\/403/);
      
      // Deve renderizar a página Forbidden
      const forbiddenContainer = page.getByTestId("app-forbidden");
      await expect(forbiddenContainer).toBeVisible();
      await expect(page.getByText(/Acesso Negado/i)).toBeVisible();
    });
  }

  test("sidebar: itens do grupo 'Logística Onda A' NÃO aparecem para vendedor", async ({ page }) => {
    await gotoAndSettle(page, "/");

    // Itens agora devem estar ocultos via adminOnly: true no SidebarReorganized
    for (const r of ROUTES) {
      await expect(page.getByRole("link", { name: r.label })).toHaveCount(0);
    }
  });
});
