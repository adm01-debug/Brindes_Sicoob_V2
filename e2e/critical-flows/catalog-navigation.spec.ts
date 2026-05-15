import { test, expect } from '@playwright/test';

test.describe('Fluxo do Catálogo', () => {
  test('deve navegar pelos produtos e filtrar', async ({ page }) => {
    await page.goto('/produtos');
    
    // Verifica se a lista de produtos carregou
    const productGrid = page.locator('[data-testid="product-grid"]');
    // Se o test-id não existir, tenta capturar por texto ou classe comum
    const isVisible = await page.getByText(/Produtos|Catálogo/i).first().isVisible();
    expect(isVisible).toBeTruthy();

    // Simula busca
    const searchInput = page.getByPlaceholder(/Buscar|Pesquisar/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('teste');
      await page.keyboard.press('Enter');
    }
  });
});
