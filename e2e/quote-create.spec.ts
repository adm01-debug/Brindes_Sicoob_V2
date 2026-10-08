import { gotoAndSettle } from './helpers/nav';
/**
 * E2E: Quote Creation — Happy path smoke tests
 *
 * These tests verify the quote builder pages load correctly
 * and the navigation flow works. Full creation requires auth.
 */
import { test, expect } from '@playwright/test';

test.describe('Quote Creation Flow', () => {
  test('should redirect to login when accessing /orcamentos unauthenticated', async ({ page }) => {
    await gotoAndSettle(page, '/orcamentos');
    // Protected route should redirect to login
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect to login when accessing /orcamentos/novo unauthenticated', async ({
    page,
  }) => {
    await gotoAndSettle(page, '/orcamentos/novo');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect to login when accessing quote view unauthenticated', async ({ page }) => {
    await gotoAndSettle(page, '/orcamentos/some-fake-id');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect to login when accessing quote kanban unauthenticated', async ({ page }) => {
    await gotoAndSettle(page, '/orcamentos/kanban');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect to login when accessing quote dashboard unauthenticated', async ({
    page,
  }) => {
    await gotoAndSettle(page, '/orcamentos/dashboard');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
});
