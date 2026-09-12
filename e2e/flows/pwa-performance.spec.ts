import { test, expect, requireAuth } from "../fixtures/test-base";
import { loginAs } from "../helpers/auth";
import { gotoAndSettle } from "../helpers/nav";

test.describe("PWA Performance & Resilience", () => {
  test.beforeEach(() => requireAuth());

  test("Service Worker registrado atende navegação offline", async ({ page, context }) => {
    await loginAs(page);
    await gotoAndSettle(page, "/produtos");

    const swRegistration = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    });
    test.skip(!swRegistration, "O servidor E2E de desenvolvimento não registra Service Worker.");

    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    const catalogTitle = await page.getByRole("heading", { name: /catálogo/i }).isVisible();
    expect(catalogTitle).toBeTruthy();
    await context.setOffline(false);
  });

  test("Core Web Vitals Budget Check", async ({ page }) => {
    await loginAs(page);
    await gotoAndSettle(page, "/produtos");

    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve(5000), 5000);
      });
    });

    console.log(`LCP Measured in E2E: ${lcp}ms`);
    expect(Number(lcp)).toBeLessThan(2500);
  });
});
