import { describe, expect, it } from 'vitest';
import { verifyFunctionDeploy } from '../../scripts/verify-supabase-function-deploy.mjs';

const before = {
  functions: [
    { slug: 'artwork', version: 4 },
    { slug: 'approval', version: 5 },
  ],
};

describe('verifyFunctionDeploy', () => {
  it('aceita versão incrementada para função alterada', () => {
    const result = verifyFunctionDeploy({
      before,
      after: {
        functions: [
          { slug: 'artwork', version: 5 },
          { slug: 'approval', version: 5 },
        ],
      },
      unchangedByCli: ['approval'],
      expectedFunctions: ['artwork', 'approval'],
    });

    expect(result.map(({ currentVersion }) => currentVersion)).toEqual([5, 5]);
  });

  it('aceita versão igual somente quando a CLI confirma a função exata sem alteração', () => {
    const result = verifyFunctionDeploy({
      before,
      after: before,
      unchangedByCli: ['artwork', 'approval'],
      expectedFunctions: ['artwork', 'approval'],
    });

    expect(result.every(({ unchanged }) => unchanged)).toBe(true);
  });

  it('rejeita versão igual sem evidência nominal da CLI', () => {
    expect(() =>
      verifyFunctionDeploy({
        before,
        after: before,
        unchangedByCli: ['approval'],
        expectedFunctions: ['artwork', 'approval'],
      }),
    ).toThrow(/artwork: versão permaneceu em 4/);
  });

  it('rejeita regressão de versão', () => {
    expect(() =>
      verifyFunctionDeploy({
        before,
        after: {
          functions: [
            { slug: 'artwork', version: 3 },
            { slug: 'approval', version: 6 },
          ],
        },
        unchangedByCli: ['approval'],
        expectedFunctions: ['artwork', 'approval'],
      }),
    ).toThrow(/versão publicada regrediu/);
  });

  it('rejeita função ausente e versão malformada', () => {
    expect(() =>
      verifyFunctionDeploy({
        before,
        after: { functions: [{ slug: 'artwork', version: 5 }] },
        unchangedByCli: [],
        expectedFunctions: ['artwork', 'approval'],
      }),
    ).toThrow(/Função ausente/);

    expect(() =>
      verifyFunctionDeploy({
        before,
        after: {
          functions: [
            { slug: 'artwork', version: 'n/a' },
            { slug: 'approval', version: 6 },
          ],
        },
        unchangedByCli: [],
        expectedFunctions: ['artwork', 'approval'],
      }),
    ).toThrow(/versão inválida/);
  });
});
