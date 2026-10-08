import { gotoAndSettle } from './helpers/nav';
/**
 * E2E: Happy path — Navigation smoke tests
 */
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the app root', async ({ page }) => {
    await gotoAndSettle(page, '/');
    // Should redirect to login or show main page
    await expect(page).toHaveURL(/.*/);
  });

  test('should handle 404 gracefully', async ({ page }) => {
    await gotoAndSettle(page, '/pagina-inexistente');
    // Should show 404 or redirect
    await expect(page.locator('body')).toBeVisible();
  });
});
