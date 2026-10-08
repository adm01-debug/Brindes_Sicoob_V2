/**
 * E2E: estabilidade da busca global e do assistente de voz.
 */
import { test, expect, type Page } from '@playwright/test';
import { gotoAndSettle, settleAfterAction } from './helpers/nav';

const SEARCH_TERM = 'caneta';

interface RuntimeErrors {
  console: string[];
  page: string[];
  network: string[];
}

function captureRuntimeErrors(page: Page): RuntimeErrors {
  const errors: RuntimeErrors = { console: [], page: [], network: [] };
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    // O Chromium reporta respostas HTTP esperadas como console.error sem
    // informar a URL. Falhas de transporte continuam cobertas abaixo.
    if (/^Failed to load resource: the server responded with a status of \d+/.test(message.text())) return;
    errors.console.push(message.text());
  });
  page.on('pageerror', (error) => errors.page.push(error.message));
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? 'falha desconhecida';
    if (/ERR_ABORTED|ERR_NETWORK_CHANGED/.test(reason)) return;
    errors.network.push(`${request.resourceType()}: ${request.url()} — ${reason}`);
  });
  return errors;
}

function expectStableRuntime(errors: RuntimeErrors): void {
  expect(errors.page, 'erros JavaScript não tratados').toEqual([]);
  expect(errors.console, 'mensagens console.error').toEqual([]);
  expect(errors.network, 'requisições inesperadamente interrompidas').toEqual([]);
}

test.describe('Busca global', () => {
  test.describe.configure({ timeout: 90_000 });

  test('abre, pesquisa e mantém o diálogo estável', async ({ page }) => {
    const errors = captureRuntimeErrors(page);
    await gotoAndSettle(page, '/');

    const searchTrigger = page
      .getByTestId('global-search-trigger')
      .or(page.getByRole('button', { name: /Busca inteligente/i }))
      .first();
    await expect(searchTrigger).toBeVisible({ timeout: 30_000 });
    await searchTrigger.click();
    const input = page.getByTestId('global-search-input');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    await input.fill(SEARCH_TERM);
    await settleAfterAction(page, { timeout: 2_000 });

    await expect(page.getByTestId('global-search-results')).toBeVisible();
    await expect(page.getByTestId('global-search-footer')).toBeVisible();
    expectStableRuntime(errors);
  });

  test('abre o assistente de voz sem erro de renderização', async ({ page }) => {
    const errors = captureRuntimeErrors(page);
    await gotoAndSettle(page, '/');

    const voiceTrigger = page.getByTestId('global-search-voice-trigger');
    await expect(voiceTrigger).toBeVisible({ timeout: 30_000 });
    await voiceTrigger.click();
    await settleAfterAction(page, { timeout: 5_000 });
    expectStableRuntime(errors);
    await expect(page.getByTestId('voice-search-dialog')).toBeVisible({ timeout: 30_000 });
  });
});
