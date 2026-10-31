import { describe, expect, it } from 'vitest';
import {
  requiredFunctions,
  verifyPublishedFunctions,
} from '../../scripts/ci/verify-supabase-functions-published.mjs';

function listedAtVersion(version: number) {
  return requiredFunctions.map((slug) => ({ slug, version }));
}

describe('verifyPublishedFunctions', () => {
  it('aceita função inalterada quando o deploy informa que não havia mudanças', () => {
    expect(() => verifyPublishedFunctions(listedAtVersion(5), listedAtVersion(5))).not.toThrow();
  });

  it('aceita função recém-publicada com versão maior', () => {
    expect(() => verifyPublishedFunctions(listedAtVersion(5), listedAtVersion(6))).not.toThrow();
  });

  it('rejeita função ausente na lista atual', () => {
    const current = listedAtVersion(5).filter(({ slug }) => slug !== 'sicoob-approval-reconciliation');
    expect(() => verifyPublishedFunctions(listedAtVersion(5), current))
      .toThrow(/sicoob-approval-reconciliation.*ausente/);
  });

  it('rejeita versão atual inválida ou regressiva', () => {
    const invalidVersion = listedAtVersion(5);
    invalidVersion[0] = { ...invalidVersion[0], version: 'indisponível' as unknown as number };
    expect(() => verifyPublishedFunctions(listedAtVersion(5), invalidVersion))
      .toThrow(/expert-chat.*ausente\/inválida/);

    expect(() => verifyPublishedFunctions(listedAtVersion(5), listedAtVersion(4)))
      .toThrow(/expert-chat.*anterior: 5/);
  });
});
