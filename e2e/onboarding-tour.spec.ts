import { test, expect } from '@playwright/test';

test.describe('Onboarding Tour', () => {
  test.beforeEach(async ({ page }) => {
    // Login or bypass auth if needed - assuming existing session or common login helper
    await page.goto('/');
    
    // Esperar carregar o app
    await page.waitForLoadState('networkidle');
  });

  test('should complete the tour successfully', async ({ page }) => {
    // Verificar se o tour abriu (pelo menos o primeiro passo)
    const tourOverlay = page.locator('div.fixed.inset-0.z-\\[100\\]');
    await expect(tourOverlay).toBeVisible({ timeout: 10000 });

    // Verificar título do primeiro passo
    await expect(page.getByText('Bem-vindo ao Brindes Sicoob!')).toBeVisible();

    // Clicar em Próximo
    await page.getByRole('button', { name: 'Próximo' }).click();
    
    // Verificar se avançou (título deve mudar)
    await expect(page.getByText('Catálogo de Produtos')).toBeVisible();

    // Clicar em Anterior
    await page.getByRole('button', { name: 'Anterior' }).click();
    await expect(page.getByText('Bem-vindo ao Brindes Sicoob!')).toBeVisible();

    // Pular tour pelo botão X
    await page.getByLabel('Fechar').click();
    
    // Tour deve desaparecer
    await expect(tourOverlay).not.toBeVisible();
  });

  test('should handle missing target elements gracefully', async ({ page }) => {
    // Simular um passo onde o target não existe (ou apenas observar o comportamento padrão)
    // O tour deve mostrar o tooltip centralizado se o target não for encontrado
    
    // Avançar até o passo 3 (Busca Inteligente)
    await page.getByRole('button', { name: 'Próximo' }).click();
    await page.getByRole('button', { name: 'Próximo' }).click();
    
    await expect(page.getByText('Busca Inteligente')).toBeVisible();
    
    // O tooltip deve estar visível mesmo se o seletor falhar (fallback implementado)
    const tooltip = page.locator('div.bg-card.border.border-border');
    await expect(tooltip).toBeVisible();
  });
});
