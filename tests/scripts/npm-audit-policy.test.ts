import { describe, expect, it } from 'vitest';

import { collectAdvisoryIds, isFullyAllowlisted, summarize } from '../../scripts/lib/npm-audit-policy.mjs';

const ALLOWED = 'GHSA-fc5q-39xc-vjpf';
const OUTRO = 'GHSA-0000-0000-0000';

function auditJson(vulnerabilities: Record<string, unknown>) {
  return JSON.stringify({ vulnerabilities });
}

describe('politica do gate de npm audit', () => {
  it('libera o pacote quando todos os advisories estao liberados', () => {
    const vulns = {
      picomatch: {
        severity: 'high',
        via: [{ title: 'ReDoS', url: `https://github.com/advisories/${ALLOWED}` }],
      },
    };

    expect(isFullyAllowlisted('picomatch', vulns)).toBe(true);
    expect(summarize(auditJson(vulns))).toMatchObject({
      blocking: [],
      allowlisted: ['picomatch (high)'],
    });
  });

  it('bloqueia o pacote quando surge um advisory nao liberado', () => {
    const vulns = {
      picomatch: {
        severity: 'high',
        via: [
          { title: 'ReDoS', url: `https://github.com/advisories/${ALLOWED}` },
          { title: 'RCE futura', url: `https://github.com/advisories/${OUTRO}` },
        ],
      },
    };

    expect(isFullyAllowlisted('picomatch', vulns)).toBe(false);
    expect(summarize(auditJson(vulns))).toMatchObject({
      blocking: ['picomatch (high)'],
      allowlisted: [],
    });
  });

  it('segue a cadeia via transitiva sem entrar em laco infinito', () => {
    const vulns = {
      picomatch: {
        severity: 'high',
        via: [{ title: 'ReDoS', url: `https://github.com/advisories/${ALLOWED}` }],
      },
      micromatch: { severity: 'high', via: ['picomatch', 'vite'] },
      vite: { severity: 'high', via: ['micromatch'] },
    };

    expect(collectAdvisoryIds('micromatch', vulns)).toEqual([ALLOWED]);
    expect(isFullyAllowlisted('micromatch', vulns)).toBe(true);
  });

  it('nao libera pacote sem advisory identificavel', () => {
    const vulns = { generico: { severity: 'critical', via: [] } };

    expect(isFullyAllowlisted('generico', vulns)).toBe(false);
    expect(summarize(auditJson(vulns))).toMatchObject({ blocking: ['generico (critical)'] });
  });
});