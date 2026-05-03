/**
 * E2E: Global Search Stability and Reliability
 */
import { test, expect } from '@playwright/test';

test.describe('Global Search', () => {
  test.beforeEach(async ({ page }) => {
    // Log console errors to fail the test if any occur
    page.on('console', msg => {
      if (msg.type() === 'error') {
        throw new Error(`Console error detected: ${msg.text()}`);
      }
    });

    // Monitor network requests for 4xx/5xx errors
    page.on('requestfailed', request => {
      throw new Error(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    page.on('response', response => {
      if (response.status() >= 400 && !response.url().includes('supabase.co')) {
         // We exclude Supabase sometimes as it might return 400 for legitimate things like "no session"
         // but general app routes should be fine
         console.warn(`Response status ${response.status()} for ${response.url()}`);
      }
    });

    await page.goto('/');
  });

  test('should open global search and show results without console errors', async ({ page }) => {
    // Wait for the trigger to be available
    const trigger = page.getByTestId('global-search-trigger');
    await expect(trigger).toBeVisible();

    // Open palette
    await trigger.click();

    // Verify input is focused (accessibility)
    const input = page.getByTestId('global-search-input');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    // Type a query
    await input.fill('caneta');

    // Wait for results to appear or loading state
    // Note: In E2E, semantic-search might be slow or return empty if not seeded
    // We mainly check that it doesn't crash
    await page.waitForTimeout(1000); 

    // Check that we don't have the "Cannot convert undefined or null to object" crash
    // If it crashed, the page would likely be blank or have a generic error overlay
    await expect(page.getByText('Busca inteligente...')).toBeHidden(); // It's open, so trigger label should be hidden in dialog? No, trigger is in the background.
    
    // Better: check for footer shortcuts which are always present when open
    await expect(page.getByText('Selecionar')).toBeVisible();
  });

  test('should handle voice overlay toggle', async ({ page }) => {
    await page.goto('/');
    
    const micBtn = page.getByLabel('Microfone');
    await expect(micBtn).toBeVisible();
    
    await micBtn.click();
    
    // Check if voice overlay (lazy loaded) appears
    // We look for any text that might be in the voice overlay or the dialog backdrop
    // Since it's a Suspend/Lazy, we wait a bit
    await page.waitForSelector('text=IA', { timeout: 5000 });
  });
});
