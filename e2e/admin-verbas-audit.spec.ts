import { gotoAndSettle, waitForRouteIdle } from './helpers/nav';
import { test, expect } from '@playwright/test';

test.describe('AdminVerbasPage E2E', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndSettle(page, '/admin/verbas');
    await waitForRouteIdle(page);
    const accessDenied = page.getByRole('heading', { name: /Acesso Negado/i });
    if (await accessDenied.isVisible().catch(() => false)) {
      test.skip(true, 'Sessão atual não possui o papel admin exigido por /admin/verbas.');
    }
  });

  test('should navigate to changes history tab and see content', async ({ page }) => {
    // 1. Garantir que a página carregou o título principal
    await expect(page.locator('h1')).toContainText(/Gestão de Verbas/);

    // 2. Localizar e clicar na aba de Histórico de Alterações
    const auditTab = page.getByRole('tab', { name: /Histórico de Alterações/i });
    await expect(auditTab).toBeVisible();
    await auditTab.click();

    // 3. Verificar se o Card de Histórico apareceu
    const historyTitle = page.getByText(/Histórico de Orçamentos/i);
    await expect(historyTitle).toBeVisible();

    // 4. Verificar se a descrição específica da aba está presente
    const description = page.getByText(/Últimas 50 ações realizadas/i);
    await expect(description).toBeVisible();

    // 5. Garantir que a tabela foi montada
    await expect(page.locator('table')).toBeVisible();
  });
});
