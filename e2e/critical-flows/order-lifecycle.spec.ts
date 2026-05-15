import { test, expect } from '@playwright/test';

test.describe('Ciclo de Vida do Pedido', () => {
  test('deve visualizar lista de pedidos e detalhes', async ({ page }) => {
    await page.goto('/pedidos');
    
    // Verifica carregamento
    await expect(page.getByText(/Pedidos/i).first()).toBeVisible();
    
    // Tenta clicar no primeiro pedido se existir
    const firstOrder = page.locator('a[href^="/pedidos/"]').first();
    if (await firstOrder.isVisible()) {
      await firstOrder.click();
      await expect(page).toHaveURL(/\/pedidos\/.+/);
    }
  });
});
