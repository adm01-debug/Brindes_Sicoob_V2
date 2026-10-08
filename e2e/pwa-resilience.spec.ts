import { gotoAndSettle } from './helpers/nav';
import { test, expect } from '@playwright/test';

test.describe('PWA em build de produção', () => {
  test('registra o Service Worker e entrega fallback offline real', async ({ page, context }) => {
    await gotoAndSettle(page, '/loja-demo');
    await expect
      .poll(() =>
        page.evaluate(async () =>
          Boolean((await navigator.serviceWorker.getRegistration())?.active),
        ),
      )
      .toBe(true);
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);

    const cachedShell = await page.evaluate(async () => ({
      manifest: Boolean(await caches.match('/manifest.json')),
      offline: Boolean(await caches.match('/offline.html')),
    }));
    expect(cachedShell).toEqual({ manifest: true, offline: true });

    await context.setOffline(true);
    await gotoAndSettle(page, '/rota-indisponivel-sem-rede');
    await expect(page.getByTestId('offline-fallback')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Você está sem conexão' })).toBeVisible();
    await context.setOffline(false);
  });
});
