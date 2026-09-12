import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const url = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4178';
if (!['127.0.0.1','localhost'].includes(new URL(url).hostname)) throw new Error('Esta simulação só pode usar servidor local.');
const pasta = 'docs/execucao/evidencias/visual';
await mkdir(pasta, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.QA_CHROMIUM_PATH, headless: true });
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    // Nenhum backend real participa; a aplicação continua usando o código de produção.
    await context.route('http://127.0.0.1:59999/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'BACKEND_SINTETICO_INDISPONIVEL' }) }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${url}/login`);
    await page.getByRole('heading', { level: 1, name: 'Acesse seu portal' }).waitFor({ timeout: 60000 });
    await page.locator('#initial-splash').waitFor({ state: 'detached', timeout: 15000 });
    const measurements = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, logos: [...document.querySelectorAll('img[alt="Sicoob"]')].map(image => ({ complete: image.complete, width: image.naturalWidth })) }));
    assert.equal(measurements.overflow, false, 'Rolagem horizontal na entrada');
    assert.ok(measurements.logos.every(image => image.complete && image.width > 0), 'Marca não carregou');
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const axe = await page.evaluate(async () => window.axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } }));
    await page.screenshot({ path: `${pasta}/login-${viewport.width}.png`, fullPage: true });
    await page.getByLabel('E-mail de trabalho').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'login-password', 'Ordem do teclado');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.locator('#login-email-error').waitFor();
    results.push({ viewport, measurements, errors, acessibilidade: { violacoes: axe.violations.map(v => ({ id: v.id, impacto: v.impact, nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })) })), aprovacoes: axe.passes.length }, teclado: 'validado', validacaoFormulario: 'validada', backend: 'sintético indisponível; não comprova login real' });
    await context.close();
  }
} finally {
  await writeFile(`${pasta}/resultado.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
assert.ok(results.every(result => result.errors.length === 0 && result.acessibilidade.violacoes.length === 0), 'Há erros de execução ou acessibilidade no relatório');
console.log(JSON.stringify(results.map(r => ({ largura: r.viewport.width, erros: r.errors.length, violacoes: r.acessibilidade.violacoes.length, teclado: r.teclado }))));
