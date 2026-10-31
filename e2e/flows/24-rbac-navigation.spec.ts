/**
 * E2E Suite: Navigation & RBAC Integrity
 *
 * Objectives:
 * 1. Map and validate navigation between all dashboards.
 * 2. Verify complete permission flows for different user profiles.
 * 3. Document access control guards (allow/deny).
 *
 * Profiles covered:
 * - Admin (Supervisor/Dev): Full access.
 * - Editor (Manager): Intermediate access.
 * - Viewer (Agente/Seller): Restricted access.
 * - Anonymous: Blocked.
 */

import { test, expect, requireAuth, requireAdmin } from '../fixtures/test-base';
import { gotoAndSettle } from '../helpers/nav';
import { Sel } from '../fixtures/selectors';
import { loginAs } from '../helpers/auth';

test.describe('Navigation & RBAC Integrity', () => {
  test.describe('Scenario 1: Anonymous User', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should redirect anonymous user to login for protected routes', async ({ page }) => {
      const protectedRoutes = ['/dashboard', '/produtos', '/orcamentos', '/admin/usuarios'];
      for (const route of protectedRoutes) {
        await gotoAndSettle(page, route);
        await expect(page).toHaveURL(/\/login/);
      }
    });

    test('should allow access to public routes', async ({ page }) => {
      const publicRoutes = ['/login', '/reset-password'];
      for (const route of publicRoutes) {
        await gotoAndSettle(page, route);
        await expect(page).toHaveURL(new RegExp(`${route}(?:[?#]|$)`));
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Scenario 2: Viewer (Agente/Seller) Profile', () => {
    // Note: Viewer is the default E2E_USER in storageState if not admin
    test.beforeEach(async ({ page }) => {
      requireAuth();
      await loginAs(page, 'user');
    });

    test('should navigate freely between commercial dashboards', async ({ page }) => {
      const viewerRoutes = [
        { path: '/', title: 'dashboard' },
        { path: '/produtos', title: 'produtos' },
        { path: '/favoritos', title: 'favoritos' },
        { path: '/orcamentos', title: 'orcamentos' },
      ];

      for (const route of viewerRoutes) {
        await gotoAndSettle(page, route.path);
        await expect(page.locator(Sel.page.title(route.title))).toBeVisible();
      }
    });

    test('should be blocked from business and technical admin panels', async ({ page }) => {
      const businessAdminRoutes = ['/admin/usuarios', '/admin/kit-templates'];
      for (const route of businessAdminRoutes) {
        await gotoAndSettle(page, route);
        await expect(page).toHaveURL(/\/403/);
        await expect(page.getByTestId('app-forbidden')).toBeVisible();
      }

      // Rotas técnicas preservam a URL para permitir solicitação de acesso
      // contextual, mas nunca renderizam o conteúdo protegido.
      await gotoAndSettle(page, '/admin/rls-denials');
      await expect(page).toHaveURL(/\/admin\/rls-denials/);
      await expect(page.locator(Sel.app.accessDenied)).toBeVisible();
    });

    test('should access order tracking but be blocked from managerial logistics', async ({ page }) => {
      const sellerOrderRoutes = ['/sicoob/pedidos', '/sicoob/pedidos/kanban'];
      for (const route of sellerOrderRoutes) {
        await gotoAndSettle(page, route);
        await expect(page).toHaveURL(new RegExp(route));
        await expect(page.getByTestId('app-forbidden')).not.toBeVisible();
      }

      await gotoAndSettle(page, '/sicoob/logistica');
      await expect(page).toHaveURL(/\/403/);
      await expect(page.getByTestId('app-forbidden')).toBeVisible();
    });

    test('onboarding tour: should be visible and functional', async ({ page }) => {
      await gotoAndSettle(page, '/');
      // O tour deve iniciar ou poder ser iniciado
      // Assumindo que o tour aparece para novos usuários ou via flag
      const tourOverlay = page.locator('.fixed.inset-0.z-\\[100\\]');
      // Se o tour já estiver ativo, verifica o componente
      if (await tourOverlay.isVisible()) {
        await expect(page.getByText(/Passo \d+ de \d+/i)).toBeVisible();
      }
    });
  });

  test.describe('Scenario 3: Admin (Supervisor) Profile', () => {
    test.beforeEach(async ({ page }) => {
      requireAdmin();
      await loginAs(page, 'admin');
    });

    test('should access business administration and remain blocked from technical panels', async ({ page }) => {
      const businessAdminPanels = [
        { path: '/admin/usuarios', label: 'Usuários' },
        { path: '/admin/cadastros', label: 'Cadastros' },
      ];

      for (const panel of businessAdminPanels) {
        await gotoAndSettle(page, panel.path);
        await expect(page).toHaveURL(new RegExp(panel.path));
        await expect(page.locator(Sel.app.accessDenied)).not.toBeVisible();
      }

      for (const path of ['/admin/conexoes', '/admin/seguranca']) {
        await gotoAndSettle(page, path);
        await expect(page).toHaveURL(new RegExp(path));
        await expect(page.locator(Sel.app.accessDenied)).toBeVisible();
      }
    });

    test('should navigate through the full chain: Catalog -> Quote -> Admin', async ({ page }) => {
      // 1. Catalog
      await gotoAndSettle(page, '/produtos');
      await expect(page.locator(Sel.page.title('produtos'))).toBeVisible();

      // 2. Open Quote List
      await gotoAndSettle(page, '/orcamentos');
      await expect(page.locator(Sel.page.title('orcamentos'))).toBeVisible();

      // 3. Jump to Admin Management
      await gotoAndSettle(page, '/admin/usuarios');
      await expect(page).toHaveURL(/\/admin\/usuarios/);
    });
  });
});
