/**
 * E2E: Matriz de Permissões Automatizada
 * 
 * Este arquivo utiliza a matriz de permissões definida em permissions-matrix.ts
 * para parametrizar e executar testes de acesso de forma escalável.
 */
import { test, expect } from "./fixtures/test-base";
import { loginAs, logout, Role as AuthRole } from "./helpers/auth";
import { gotoAndSettle } from "./helpers/nav";
import { PERMISSION_MATRIX, Role, resolvePath } from "./fixtures/permissions-matrix";
import { Sel } from "./fixtures/selectors";

test.describe("Matriz de Permissões Automatizada", () => {

  // Mapeamento de nomes de role da matriz para o helper loginAs
  const roleMap: Record<Exclude<Role, "publico">, AuthRole> = {
    agente: "user",
    supervisor: "admin",
    dev: "dev"
  };

  // Testa cada papel definido na matriz
  for (const [role, routes] of Object.entries(PERMISSION_MATRIX)) {
    test.describe(`Perfil: ${role}`, () => {
      
      test.beforeEach(async ({ page }) => {
        if (role === "publico") {
          await logout(page);
        } else {
          await loginAs(page, roleMap[role as keyof typeof roleMap]);
        }
      });

      // Testa cada rota para o papel atual
      for (const route of routes) {
        const actualPath = resolvePath(route);
        test(`acesso a ${actualPath} deve resultar em ${route.expectedBehavior}`, async ({ page }) => {
          await gotoAndSettle(page, actualPath);

          switch (route.expectedBehavior) {
            case "allow":
              if (actualPath === "/login") {
                await expect(page).toHaveURL(/\/login/);
              } else {
                await expect(page).not.toHaveURL(/\/login/);
              }
              if (actualPath !== "/" && actualPath !== "/login") {
                await expect(page).toHaveURL(new RegExp(actualPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
              }
              await expect(page.locator(`${Sel.app.forbidden}, ${Sel.app.accessDenied}`)).not.toBeVisible();
              break;

            case "deny_login":
              await expect(page).toHaveURL(/\/login/);
              break;

            case "deny_403":
              // AdminRoute redireciona para /403; DevRoute preserva a URL e
              // exibe sua negação contextual. Ambos devem bloquear o conteúdo.
              await expect(page.locator(`${Sel.app.forbidden}, ${Sel.app.accessDenied}`)).toBeVisible();
              break;
          }
        });
      }
    });
  }
});
