import { gotoAndSettle } from '../helpers/nav';
import { test, expect } from '@playwright/test';

const SEARCH_TERM = 'teste';

test.describe('Fluxo do Catálogo', () => {
  test('deve navegar pelos produtos e filtrar', async ({ page }) => {
    await gotoAndSettle(page, '/produtos');

    await expect(page.getByTestId('page-title-dashboard')).toBeVisible();
    await expect(page.getByRole('grid', { name: 'Catálogo de produtos' })).toBeVisible();

    const searchInput = page.getByTestId('catalog-search-input');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(SEARCH_TERM);
    await searchInput.press('Enter');
    await expect(searchInput).toHaveValue(SEARCH_TERM);
  });
});
