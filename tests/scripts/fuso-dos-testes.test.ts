/**
 * Catraca: a suíte roda no fuso do projeto, não no do runner.
 *
 * O runner da CI roda em UTC; o produto roda em Brasília. A diferença não é
 * cosmética — em UTC, `new Date('2026-11-19')` e `parseISO('2026-11-19')`
 * devolvem o mesmo instante, então um teste que vigia essa distinção passa
 * verde com a implementação errada, e o bug só aparece para o vendedor.
 *
 * O caso concreto que motivou isto: filtro de período da lista de pedidos lido
 * com `new Date` esconde o pedido do próprio dia, porque a meia-noite UTC do
 * dia 19 é 21h do dia 18 aqui.
 *
 * Se alguém remover `env.TZ` de `vitest.config.ts`, este arquivo fica vermelho
 * antes de qualquer regra de data passar a mentir em silêncio.
 */
import { describe, expect, it } from 'vitest';

const FUSO = 'America/Sao_Paulo';

describe('fuso horário da suíte', () => {
  it('roda no fuso do projeto', () => {
    expect(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      'vitest.config.ts precisa manter env.TZ = America/Sao_Paulo',
    ).toBe(FUSO);
  });

  it('o fuso é negativo — é isso que faz a leitura de data discriminar', () => {
    // Em Brasília o deslocamento é positivo em minutos (UTC-3 => +180).
    expect(new Date('2026-11-19T12:00:00Z').getTimezoneOffset()).toBeGreaterThan(0);
  });

  it('data ISO sem hora lida como UTC cai no dia anterior aqui', () => {
    // É exatamente o erro que `parseISO` evita. Se este caso parar de valer, o
    // runner voltou para UTC e os testes de período deixaram de proteger.
    expect(new Date('2026-11-19').getDate()).toBe(18);
  });
});
