import { gotoAndSettle } from './helpers/nav';
/**
 * E2E: Mockup Generation — Smoke
 */
import { test, expect } from '@playwright/test';

test.describe('Mockup Generator', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('mockup studio requires auth', async ({ page }) => {
    await gotoAndSettle(page, '/mockup-generator');
    await expect(page).toHaveURL(/login/);
  });

  test('magic up requires auth', async ({ page }) => {
    await gotoAndSettle(page, '/magic-up');
    await expect(page).toHaveURL(/login/);
  });
});
