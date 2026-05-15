import { test, expect } from '@playwright/test';

test.describe('Autenticação e Navegação Inicial', () => {
  test('deve redirecionar para login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard');
    // Verifica se foi redirecionado para a página de auth ou se o elemento de login está visível
    await expect(page).toHaveURL(/.*auth|.*login/);
  });

  test('deve carregar a página inicial corretamente', async ({ page }) => {
    await page.goto('/');
    // Se estiver em modo preview/dev, pode carregar direto ou pedir login
    // Validamos apenas que a página não quebra (status 200)
    const response = await page.request.get('/');
    expect(response.status()).toBe(200);
  });
});
