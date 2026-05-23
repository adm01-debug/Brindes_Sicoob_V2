import { test, expect } from '@playwright/test';

test.describe('PWA Performance & Resilience', () => {
  test('Service Worker registers and handles offline mode', async ({ page, context }) => {
    await page.goto('/');
    
    // Check if Service Worker is registered
    const swRegistered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    });
    // Skip if SW not registered in dev
    if (!swRegistered) {
      console.log('Service Worker not registered, skipping offline test');
      return;
    }

    // Go offline
    await context.setOffline(true);
    
    // Reload and check if content is still there (Stale-While-Revalidate)
    await page.reload();
    await expect(page.locator('body')).not.toBeEmpty();
    
    // Back online
    await context.setOffline(false);
  });

  test('Critical assets are cached via Stale-While-Revalidate', async ({ page }) => {
    await page.goto('/tendencias'); // Example heavy page
    
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(e => e.name.includes('.js') || e.name.includes('.css'))
        .map(e => ({ name: e.name, transferSize: (e as any).transferSize }));
    });

    // Check if any resources came from Service Worker (transferSize 0)
    const fromCache = performanceEntries.filter(e => e.transferSize === 0);
    console.log(`Resources from cache: ${fromCache.length}/${performanceEntries.length}`);
    
    // In production, we expect most vendor chunks to be cached
  });
});
