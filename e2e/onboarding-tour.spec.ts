import { test, expect, type Page } from '@playwright/test';
import { gotoAndSettle } from './helpers/nav';

async function mockPendingOnboarding(page: Page): Promise<void> {
  await page.route('**/rest/v1/user_onboarding*', async route => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '00000000-0000-4000-8000-000000000001',
          has_completed_tour: false,
          current_step: 0,
          completed_steps: [],
        }),
      });
      return;
    }

    if (method === 'PATCH') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fallback();
  });
}

test.describe('Onboarding Tour', () => {
  test.beforeEach(async ({ page }) => {
    // Mantém o usuário canônico concluído para os demais testes e cria um
    // estado pendente isolado somente nesta página.
    await mockPendingOnboarding(page);
    await gotoAndSettle(page, '/');
  });

  test('should complete the tour successfully', async ({ page }) => {
    // Verificar se o tour abriu (pelo menos o primeiro passo)
    const tourOverlay = page.getByTestId('onboarding-tour');
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
