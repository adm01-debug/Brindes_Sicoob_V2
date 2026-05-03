import { test, expect } from '@playwright/test';

test.describe('RBAC: Dev vs Admin Access Control', () => {
  const technicalRoutes = [
    '/admin/telemetria',
    '/admin/conexoes',
    '/admin/rbac-rotas',
    '/admin/seguranca',
    '/admin/external-db'
  ];

  test('Admin user is redirected to 403 when accessing technical routes', async ({ page }) => {
    // Simular login como admin (mocking session ou usando fixture se disponível)
    // Para este teste E2E, assumimos que estamos injetando o papel no localStorage ou cookie
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        currentSession: { user: { user_metadata: { role: 'admin' } } }
      }));
    });

    for (const route of technicalRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/403/);
      await expect(page.locator('text=Acesso Negado')).toBeVisible();
      await expect(page.locator('text=Esta área é restrita a desenvolvedores')).toBeVisible();
    }
  });

  test('Dev user can access technical routes', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        currentSession: { user: { user_metadata: { role: 'dev' } } }
      }));
    });

    for (const route of technicalRoutes) {
      await page.goto(route);
      await expect(page).not.toHaveURL(/\/403/);
      // Verifica se o título da página ou um elemento específico de cada página técnica está visível
      await expect(page.locator('h1, h2')).toBeVisible();
    }
  });
});
