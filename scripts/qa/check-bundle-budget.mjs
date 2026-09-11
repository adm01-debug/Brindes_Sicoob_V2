import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const assetsDirectory = path.resolve('dist/assets');
const outputDirectory = path.resolve('bundle-stats');
const hardLimitBytes = 800 * 1024;
const warningLimitBytes = 500 * 1024;

const files = (await readdir(assetsDirectory)).filter(file => file.endsWith('.js'));
assert.ok(files.length > 0, 'Nenhum chunk JavaScript foi encontrado em dist/assets.');

const chunks = await Promise.all(files.map(async file => {
  const content = await readFile(path.join(assetsDirectory, file));
  return {
    arquivo: file,
    bytes: content.byteLength,
    gzip_bytes: gzipSync(content).byteLength,
  };
}));
chunks.sort((left, right) => right.bytes - left.bytes);

const violations = chunks.filter(chunk => chunk.bytes > hardLimitBytes);
const warnings = chunks.filter(chunk => chunk.bytes > warningLimitBytes);
const summary = {
  gerado_em: new Date().toISOString(),
  orcamento: {
    aviso_bytes: warningLimitBytes,
    limite_bytes: hardLimitBytes,
  },
  totais: {
    chunks: chunks.length,
    bytes: chunks.reduce((total, chunk) => total + chunk.bytes, 0),
    gzip_bytes: chunks.reduce((total, chunk) => total + chunk.gzip_bytes, 0),
  },
  avisos: warnings,
  violacoes: violations,
  maiores_chunks: chunks.slice(0, 20),
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(
  path.join(outputDirectory, 'summary.md'),
  [
    '# Orçamento de bundle',
    '',
    `- Chunks JavaScript: ${summary.totais.chunks}`,
    `- Total bruto: ${(summary.totais.bytes / 1024).toFixed(1)} KiB`,
    `- Total gzip: ${(summary.totais.gzip_bytes / 1024).toFixed(1)} KiB`,
    `- Maior chunk: ${chunks[0].arquivo} (${(chunks[0].bytes / 1024).toFixed(1)} KiB bruto; ${(chunks[0].gzip_bytes / 1024).toFixed(1)} KiB gzip)`,
    `- Limite por chunk: ${hardLimitBytes / 1024} KiB bruto`,
    '',
  ].join('\n'),
);

for (const chunk of warnings) {
  console.warn(`::warning file=dist/assets/${chunk.arquivo}::Chunk com ${(chunk.bytes / 1024).toFixed(1)} KiB bruto.`);
}
if (violations.length > 0) {
  console.error(`::error::${violations.length} chunk(s) excedem ${hardLimitBytes / 1024} KiB.`);
  process.exit(1);
}

console.log(JSON.stringify(summary.totais));
