import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import PptxGenJS from 'pptxgenjs';
import JSZip from 'jszip';
import { safeInternalPath } from '../../src/lib/auth/safe-internal-path.ts';

for (const path of ['https://externo.invalid', '//externo.invalid', '/\\externo.invalid', '/%5cexterno.invalid', '/%2fexterno.invalid', '/\nexterno.invalid', '/login', '/auth', '/%ZZ', undefined]) {
  test(`retorno de login recusa caminho indevido: ${JSON.stringify(path)}`, () => assert.equal(safeInternalPath(path, '/dashboard-pa'), '/dashboard-pa'));
}
test('retorno de login preserva destino interno, busca e fragmento', () => {
  assert.equal(safeInternalPath('/sicoob/pedidos?status=pending#resumo'), '/sicoob/pedidos?status=pending#resumo');
});
for (const name of ['migrate-helper', 'cleanup-novelties']) {
  for (const method of ['GET', 'POST', 'DELETE', 'OPTIONS']) {
    test(`${name} responde 410 sem ler credenciais nem acessar rede (${method})`, async () => {
      let handler;
      vm.runInNewContext(readFileSync(`supabase/functions/${name}/index.ts`, 'utf8'), {
        Deno: { serve: fn => { handler = fn; }, env: { get: () => assert.fail('Leitura de segredo indevida') } },
        Response, fetch: () => assert.fail('Rede indevida'),
      });
      const response = await handler(new Request('https://simulacao.invalid', { method }));
      assert.equal(response.status, 410);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal((await response.json()).error, 'endpoint_desativado');
    });
  }
}
test('distribuição PPTX preserva os arquivos oficiais e gera arquivo válido', async () => {
  const provenance = JSON.parse(readFileSync('vendor/pptxgenjs-browser/proveniencia.json', 'utf8'));
  for (const [file, hash] of Object.entries(provenance.arquivos_sem_modificacao)) {
    assert.equal(createHash('sha256').update(readFileSync(`vendor/pptxgenjs-browser/${file}`)).digest('hex'), hash);
  }
  const presentation = new PptxGenJS();
  presentation.layout = 'LAYOUT_WIDE';
  for (let index = 0; index < 5; index++) {
    const slide = presentation.addSlide();
    slide.addText(`Cooperativa — página ${index + 1}`, { x: 1, y: 1, w: 6, h: 1 });
  }
  const zip = await JSZip.loadAsync(await presentation.write({ outputType: 'nodebuffer' }));
  assert.equal(Object.keys(zip.files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path)).length, 5);
  assert.match(await zip.file('ppt/slides/slide1.xml').async('string'), /Cooperativa — página 1/);
});
