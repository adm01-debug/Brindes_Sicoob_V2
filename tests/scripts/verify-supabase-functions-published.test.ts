import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  requiredFunctions,
  verifyPublishedFunctions,
} from '../../scripts/ci/verify-supabase-functions-published.mjs';

function listedAtVersion(version: number) {
  return requiredFunctions.map((slug) => ({ slug, version, status: 'ACTIVE' }));
}

describe('verifyPublishedFunctions', () => {
  it('aceita função inalterada quando o deploy informa que não havia mudanças', () => {
    expect(() => verifyPublishedFunctions(listedAtVersion(5), listedAtVersion(5))).not.toThrow();
  });

  it('aceita função recém-publicada com versão maior', () => {
    expect(() => verifyPublishedFunctions(listedAtVersion(5), listedAtVersion(6))).not.toThrow();
  });

  it('rejeita função ausente na lista atual', () => {
    const current = listedAtVersion(5).filter(
      ({ slug }) => slug !== 'sicoob-approval-reconciliation',
    );
    expect(() => verifyPublishedFunctions(listedAtVersion(5), current)).toThrow(
      /atual deve conter exatamente uma entrada para sicoob-approval-reconciliation/,
    );
  });

  it('rejeita versão atual inválida ou regressiva', () => {
    const invalidVersion = listedAtVersion(5);
    invalidVersion[0] = { ...invalidVersion[0], version: 'indisponível' as unknown as number };
    expect(() => verifyPublishedFunctions(listedAtVersion(5), invalidVersion)).toThrow(
      /expert-chat.*ausente\/inválida/,
    );

    expect(() => verifyPublishedFunctions(listedAtVersion(5), listedAtVersion(4))).toThrow(
      /expert-chat.*anterior: 5/,
    );
  });

  it('rejeita função inativa, status ausente ou duplicidade de slug', () => {
    const inactive = listedAtVersion(5);
    inactive[0] = { ...inactive[0], status: 'INACTIVE' };
    expect(() => verifyPublishedFunctions(listedAtVersion(5), inactive)).toThrow(
      /expert-chat.*INACTIVE/,
    );

    const missingStatus = listedAtVersion(5);
    delete (missingStatus[0] as { status?: string }).status;
    expect(() => verifyPublishedFunctions(listedAtVersion(5), missingStatus)).toThrow(
      /status atual ausente/,
    );

    const duplicated = [...listedAtVersion(5), listedAtVersion(5)[0]];
    expect(() => verifyPublishedFunctions(listedAtVersion(5), duplicated)).toThrow(
      /exatamente uma entrada.*expert-chat/,
    );
  });

  it('aceita somente números ou strings inteiras positivas sem coerção permissiva', () => {
    const invalid = listedAtVersion(5);
    invalid[0] = { ...invalid[0], version: true as unknown as number };
    expect(() => verifyPublishedFunctions(listedAtVersion(5), invalid)).toThrow(
      /versão atual ausente\/inválida/,
    );

    const textual = listedAtVersion(5);
    textual[0] = { ...textual[0], version: '5' as unknown as number };
    expect(() => verifyPublishedFunctions(listedAtVersion(5), textual)).not.toThrow();

    for (const version of ['05', '5.0', ' 5', '5 ', '1e1', '0', '-1']) {
      const malformed = listedAtVersion(5);
      malformed[0] = { ...malformed[0], version: version as unknown as number };
      expect(() => verifyPublishedFunctions(listedAtVersion(5), malformed)).toThrow(
        /versão atual ausente\/inválida/,
      );
    }
  });

  it('não lista função que o teto do plano impede de criar', () => {
    // `quote-price-attestation` saiu da allowlist em 19/11/2026: o projeto está
    // no teto de edge functions e `supabase functions deploy` responde
    // 402 entitlement_required / function.max_count ao tentar CRIÁ-la. Como ela
    // era o último item e o passo roda com `set -euo pipefail`, toda publicação
    // morria ali e o passo "Confirmar funções publicadas" nunca executava.
    // O atesto de preço é servido por `sicoob-kit-quote` desde a #364.
    expect(requiredFunctions).not.toContain('quote-price-attestation');
  });

  it('cobre as 7 canônicas, as 7 endurecidas, crm-db-bridge e os 6 workers de cron', () => {
    // Eram 8 endurecidas; `quote-price-attestation` saiu (teto do plano, caso
    // acima), `crm-db-bridge` entrou e `send-transactional-email` foi incluída
    // em seguida — 16 - 1 = 15. Os 6 workers de pg_cron entraram depois: já
    // rodavam em produção sem passar pela verificação de publicação.
    expect(requiredFunctions).toHaveLength(21);
    for (const slug of [
      'bi-copilot',
      'comparison-ai-advisor',
      'get-app-logs',
      'get-visitor-info',
      'secure-upload',
      'auth-integrity-check',
      'crm-db-bridge',
      'send-transactional-email',
      'webhook-dispatcher',
      'connections-auto-test',
      'sicoob-approval-notifications',
      'process-batch-export',
      'send-scheduled-reports',
      'connections-health-check',
    ]) {
      expect(requiredFunctions).toContain(slug);
    }
  });

  it('mantém a lista publicada no workflow em paridade com o verificador', () => {
    const workflow = readFileSync('.github/workflows/deploy-sicoob-functions.yml', 'utf8');
    const command = workflow.match(/for function_name in \\\n([\s\S]*?)\n\s*do/);
    expect(command, 'loop de funções do workflow').not.toBeNull();
    const workflowFunctions = command?.[1]
      .split('\n')
      .map((line) => line.replace(/\\\s*$/, '').trim())
      .filter(Boolean);
    expect(workflowFunctions).toEqual(requiredFunctions);
  });
});
