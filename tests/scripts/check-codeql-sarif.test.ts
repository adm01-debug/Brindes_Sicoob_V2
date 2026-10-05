import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { inspectSarif, summaryMarkdown } from '../../scripts/check-codeql-sarif.mjs';

async function fixture(runs: unknown[]) {
  const directory = await mkdtemp(join(tmpdir(), 'codeql-sarif-'));
  await mkdir(join(directory, 'nested'));
  await writeFile(join(directory, 'nested', 'result.sarif'), JSON.stringify({ runs }));
  return directory;
}

describe('gate SARIF do CodeQL', () => {
  it('aceita uma análise válida sem achados', async () => {
    const directory = await fixture([{ tool: { driver: { rules: [] } }, results: [] }]);

    await expect(inspectSarif(directory)).resolves.toEqual({
      files: 1,
      runs: 1,
      findings: [],
    });
  });

  it('expõe regra, severidade e localização de cada achado', async () => {
    const directory = await fixture([{
      tool: {
        driver: {
          rules: [{ id: 'js/exemplo', properties: { 'security-severity': '8.1' } }],
        },
      },
      results: [{
        ruleId: 'js/exemplo',
        message: { text: 'Fluxo inseguro' },
        locations: [{ physicalLocation: {
          artifactLocation: { uri: 'src/exemplo.ts' },
          region: { startLine: 12 },
        } }],
      }],
    }]);

    const report = await inspectSarif(directory);
    expect(report.findings).toEqual([{
      rule: 'js/exemplo',
      severity: 'security-severity 8.1',
      file: 'src/exemplo.ts',
      line: 12,
      message: 'Fluxo inseguro',
    }]);
    expect(summaryMarkdown(report)).toContain('| js/exemplo | security-severity 8.1 | src/exemplo.ts:12 | Fluxo inseguro |');
  });

  it('rejeita diretório sem SARIF e SARIF sem execução', async () => {
    const emptyDirectory = await mkdtemp(join(tmpdir(), 'codeql-empty-'));
    await expect(inspectSarif(emptyDirectory)).rejects.toThrow('não gerou arquivo SARIF');

    const noRunsDirectory = await fixture([]);
    await expect(inspectSarif(noRunsDirectory)).rejects.toThrow('sem execução analisável');
  });
});
