import { describe, expect, it } from 'vitest';
import { calculateNextRun } from '@/hooks/useScheduledReports';

// A âncora da recorrência é o dia do calendário de Brasília (`getAnchorDay` no
// worker usa `brasiliaDay(created_at)`). A primeira execução precisa usar o
// mesmo calendário, senão o relatório troca de dia depois do primeiro envio.
describe('calculateNextRun mensal', () => {
  it('estreia no dia de Brasília quando a criação já é outro dia no navegador', () => {
    // 15/07 00h30 em Fernando de Noronha (UTC-2) = 14/07 23h30 em Brasília.
    // O worker ancora em 14; a primeira execução também tem de ser dia 14.
    const now = new Date('2026-07-15T02:30:00.000Z');
    const next = calculateNextRun('monthly', now);
    expect(next.toISOString().slice(0, 10)).toBe('2026-08-14');
  });

  it('não cai no dia 27 quando criado às 22h30 em Brasília', () => {
    // 28/01 22h30 em Brasília já é 29/01 em UTC; o dia local do navegador em
    // UTC-3 continua 28.
    const now = new Date('2026-01-29T01:30:00.000Z');
    expect(calculateNextRun('monthly', now).toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('ancora no dia 31 e respeita o último dia do mês destino', () => {
    const now = new Date('2026-01-31T12:00:00.000Z');
    expect(calculateNextRun('monthly', now).toISOString().slice(0, 10)).toBe('2026-02-28');
  });
});

describe('calculateNextRun diário e semanal', () => {
  it('diário soma 24h', () => {
    const now = new Date('2026-03-10T12:00:00.000Z');
    expect(calculateNextRun('daily', now).toISOString()).toBe('2026-03-11T12:00:00.000Z');
  });

  it('semanal soma 7 dias', () => {
    const now = new Date('2026-03-10T12:00:00.000Z');
    expect(calculateNextRun('weekly', now).toISOString()).toBe('2026-03-17T12:00:00.000Z');
  });
});
