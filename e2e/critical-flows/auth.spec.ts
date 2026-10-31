import { gotoAndSettle } from '../helpers/nav';
import { test, expect } from '@playwright/test';

test.describe('Autenticação e Navegação Inicial', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('deve redirecionar para login quando não autenticado', async ({ page }) => {
    await gotoAndSettle(page, '/dashboard');
    // Verifica se foi redirecionado para a página de auth ou se o elemento de login está visível
    await expect(page).toHaveURL(/.*auth|.*login/);
  });

  test('deve carregar a página inicial corretamente', async ({ page }) => {
    await gotoAndSettle(page, '/');
    // Se estiver em modo preview/dev, pode carregar direto ou pedir login
    // Validamos apenas que a página não quebra (status 200)
    const response = await page.request.get('/');
    expect(response.status()).toBe(200);
  });
});
