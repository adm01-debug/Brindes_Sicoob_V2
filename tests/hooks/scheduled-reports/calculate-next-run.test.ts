import { describe, expect, it } from 'vitest';
import { calculateNextRun } from '@/hooks/useScheduledReports';

// O agendamento é lido no calendário de Brasília: comparar em UTC esconderia
// um dia errado (23h30 de Brasília já é o dia seguinte em UTC).
const emBrasilia = (data: Date) =>
  new Date(data.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

// A âncora da recorrência é o dia do calendário de Brasília (`getAnchorDay` no
// worker usa `brasiliaDay(created_at)`). A primeira execução precisa usar o
// mesmo calendário, senão o relatório troca de dia depois do primeiro envio.
describe('calculateNextRun mensal', () => {
  it('estreia no dia de Brasília quando a criação já é outro dia no navegador', () => {
    // 15/07 00h30 em Fernando de Noronha (UTC-2) = 14/07 23h30 em Brasília.
    // O worker ancora em 14; a primeira execução também tem de ser dia 14.
    const now = new Date('2026-07-15T02:30:00.000Z');
    const next = calculateNextRun('monthly', now);
    expect(emBrasilia(next)).toBe('2026-08-14');
  });

  it('não cai no dia 27 quando criado às 22h30 em Brasília', () => {
    // 28/01 22h30 em Brasília já é 29/01 em UTC; o dia local do navegador em
    // UTC-3 continua 28.
    const now = new Date('2026-01-29T01:30:00.000Z');
    expect(emBrasilia(calculateNextRun('monthly', now))).toBe('2026-02-28');
  });

  it('criado às 21h de Brasília não fica na véspera', () => {
    // 10/03 21h em Brasília = 11/03 00h UTC. A âncora é o dia 10 (calendário de
    // Brasília) e a próxima execução mantém o mesmo horário: 10/04 21h em
    // Brasília = 11/04 00h UTC. Usando a hora UTC direto, o envio caía às 00h
    // de Brasília do dia 10, um dia antes do horário em que foi agendado.
    const now = new Date('2026-03-11T00:00:00.000Z');
    const next = calculateNextRun('monthly', now);
    expect(new Date(next.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 16)).toBe('2026-04-10T21:00');
  });

  it('ancora no dia 31 e respeita o último dia do mês destino', () => {
    const now = new Date('2026-01-31T12:00:00.000Z');
    expect(emBrasilia(calculateNextRun('monthly', now))).toBe('2026-02-28');
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
