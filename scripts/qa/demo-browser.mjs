import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';
import axe from 'axe-core';

const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4178';
const parsedUrl = new URL(baseUrl);
if (!['127.0.0.1', 'localhost'].includes(parsedUrl.hostname)) {
  throw new Error('A demonstração automatizada só pode usar um servidor local.');
}

const evidenceDirectory = 'docs/execucao/evidencias/visual';
const viewports = [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
];
const scenarios = [
  { slug: 'demo', path: '/demonstracao', heading: /Olá, Marina/ },
  { slug: 'loja', path: '/loja-demo', heading: /Brindes que aproximam/ },
];

await mkdir(evidenceDirectory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.QA_CHROMIUM_PATH,
  headless: true,
});
const results = [];

try {
  for (const viewport of viewports) {
    for (const scenario of scenarios) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = [];
      const assets = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => {
        if (response.url().includes('/brand/store/') || response.url().includes('produtos-grid-v1')) {
          assets.push({ url: response.url(), status: response.status() });
        }
      });

      await page.goto(`${baseUrl}${scenario.path}`);
      await page.getByRole('heading', { level: 1, name: scenario.heading }).waitFor({ timeout: 30_000 });

      if (scenario.slug === 'loja') {
        await page.getByRole('button', { name: 'Sustentáveis', exact: true }).click();
        assert.equal(await page.locator('article').count(), 2, 'O filtro de categoria não atualizou a vitrine.');
        await page.getByRole('button', { name: /Adicionar ao orçamento/ }).first().click();
        await page.getByRole('button', { name: /Abrir orçamento com 1 produto/ }).waitFor();
        await page.waitForTimeout(350);
        assert.ok(assets.length >= 2 && assets.every((asset) => asset.status === 200), 'Os ativos próprios da loja não carregaram.');
      }

      await page.addScriptTag({ content: axe.source });
      const accessibility = await page.evaluate(async () => window.axe.run(document.body, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      }));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

      await page.screenshot({
        path: `${evidenceDirectory}/${scenario.slug}-${viewport.width}.png`,
        fullPage: true,
      });

      results.push({
        pagina: scenario.slug,
        viewport,
        errors,
        overflow,
        assets,
        violations: accessibility.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          targets: violation.nodes.map((node) => node.target),
        })),
        dados: 'sintéticos; sem conexão com bancos',
      });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  `${evidenceDirectory}/demo-resultado.json`,
  `${JSON.stringify(results, null, 2)}\n`,
);

assert.ok(results.every((result) => (
  result.errors.length === 0
  && result.overflow === false
  && result.violations.length === 0
)), 'A demonstração contém erro de execução, rolagem horizontal ou violação WCAG automatizada.');

console.log(JSON.stringify(results.map((result) => ({
  pagina: result.pagina,
  largura: result.viewport.width,
  erros: result.errors.length,
  violacoes: result.violations.length,
  overflow: result.overflow,
}))));
