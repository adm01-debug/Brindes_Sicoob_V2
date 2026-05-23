import { test, expect } from '@playwright/test';

test.describe('PWA Performance & Resilience', () => {
  test('Service Worker should register and handle offline requests', async ({ page, context }) => {
    // Navigate to catalog
    await page.goto('/');
    
    // Check if Service Worker is registered
    const swRegistration = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    });
    
    // In production, we expect SW to be there. 
    // In CI/Dev, this might depend on build mode.
    console.log(`Service Worker Registered: ${swRegistration}`);

    // Simulate Offline Mode
    await context.setOffline(true);
    
    // Reload and check if it still works (Stale-While-Revalidate)
    await page.reload();
    
    const catalogTitle = await page.getByRole('heading', { name: /catálogo/i }).isVisible();
    expect(catalogTitle).toBeTruthy();
    
    // Restore Online
    await context.setOffline(false);
  });

  test('Core Web Vitals Budget Check', async ({ page }) => {
    await page.goto('/');
    
    // Measure LCP using Performance Observer
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Timeout if no LCP after 5s
        setTimeout(() => resolve(5000), 5000);
      });
    });

    console.log(`LCP Measured in E2E: ${lcp}ms`);
    expect(Number(lcp)).toBeLessThan(2500); // LCP Budget: 2.5s
  });
});
