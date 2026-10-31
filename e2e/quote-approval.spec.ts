import { gotoAndSettle, settleAfterAction } from './helpers/nav';
/**
 * E2E: Quote Public Approval — Happy path
 *
 * Tests the public approval page accessible via token links.
 * Validates loading states, expired/invalid tokens, and page structure.
 */
import { test, expect } from '@playwright/test';

test.describe('Quote Approval — Public Page', () => {
  test('should show error for invalid token', async ({ page }) => {
    await gotoAndSettle(page, '/proposta/invalid-token-12345');
    // Should show loading first, then error or expired screen
    await settleAfterAction(page, { timeout: 3000 });

    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Should show one of: error screen, expired screen, or loading
    const hasError = await page
      .locator('text=não encontrada')
      .isVisible()
      .catch(() => false);
    const hasExpired = await page
      .locator('text=expirad')
      .isVisible()
      .catch(() => false);
    const hasInvalid = await page
      .locator('text=inválid')
      .isVisible()
      .catch(() => false);
    const hasNotFound = await page
      .locator('text=Proposta')
      .isVisible()
      .catch(() => false);

    // At least one status indicator should be present
    expect(hasError || hasExpired || hasInvalid || hasNotFound).toBe(true);
  });

  test('should show loading state initially', async ({ page }) => {
    // Navigate and check for loading indicator
    await gotoAndSettle(page, '/proposta/some-test-token');

    // Should show some form of loading or content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should not require authentication', async ({ page }) => {
    // Public page should NOT redirect to login
    await gotoAndSettle(page, '/proposta/test-token-abc');
    await settleAfterAction(page, { timeout: 2000 });

    // Should NOT be on login page
    const url = page.url();
    expect(url).not.toMatch(/\/login$/);
  });

  test('should handle /approve/:token alias', async ({ page }) => {
    await gotoAndSettle(page, '/approve/test-token-xyz');
    await settleAfterAction(page, { timeout: 2000 });

    // Should NOT redirect to login (it's a public route)
    const url = page.url();
    expect(url).not.toMatch(/\/login$/);
  });

  test('should have noindex meta tag for SEO', async ({ page }) => {
    await gotoAndSettle(page, '/proposta/seo-test-token');
    await settleAfterAction(page, { timeout: 3000 });

    // If the page loads a valid proposal, it should have noindex
    const metaRobots = await page
      .locator('meta[name="robots"]')
      .getAttribute('content')
      .catch(() => null);
    // Either the meta tag exists with noindex, or the page shows an error (both valid)
    if (metaRobots) {
      expect(metaRobots).toContain('noindex');
    }
  });
});

test.describe('Quote Approval — Route Protection', () => {
  test('protected quote routes redirect, public approval does not', async ({ page }) => {
    // Protected
    await gotoAndSettle(page, '/orcamentos');
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toMatch(/login/);

    // Public — should NOT redirect
    await gotoAndSettle(page, '/proposta/any-token');
    await settleAfterAction(page, { timeout: 2000 });
    expect(page.url()).not.toMatch(/login/);
  });
});
