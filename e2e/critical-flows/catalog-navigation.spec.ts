import { gotoAndSettle } from '../helpers/nav';
import { test, expect } from '@playwright/test';

const SEARCH_TERM = 'teste';

test.describe('Fluxo do Catálogo', () => {
  test('deve navegar pelos produtos e filtrar', async ({ page }) => {
    await gotoAndSettle(page, '/produtos');

    await expect(page.getByRole('heading', { name: /Catálogo de Produtos/ })).toBeVisible();
    await expect(page.getByRole('article').first()).toBeVisible();

    const searchInput = page.getByRole('combobox', { name: 'Campo de busca' });
    await expect(searchInput).toBeVisible();
    await searchInput.fill(SEARCH_TERM);
    await searchInput.press('Enter');
    await expect(searchInput).toHaveValue(SEARCH_TERM);
  });
});
