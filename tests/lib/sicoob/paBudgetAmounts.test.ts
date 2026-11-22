/**
 * Tests for readPaBudgetAmounts em src/lib/sicoob/paBudgetState.ts
 * A verba vive em quatro estados (migration 20261122120000): o saldo livre
 * precisa descontar reservado e empenhado, nao apenas o consumido.
 */
import { describe, it, expect } from 'vitest';
import { readPaBudgetAmounts } from '@/lib/sicoob/paBudgetState';

describe('readPaBudgetAmounts', () => {
  it('desconta reservado, empenhado e consumido do saldo livre', () => {
    const amounts = readPaBudgetAmounts({
      verba_total: 1000,
      verba_planejada: 1200,
      verba_reservada: 200,
      verba_comprometida: 150,
      verba_consumida: 250,
    });

    expect(amounts.planejada).toBe(1200);
    expect(amounts.ocupada).toBe(600);
    expect(amounts.disponivel).toBe(600);
    expect(amounts.percentualOcupado).toBe(50);
  });

  it('trata 100% ocupado como saldo zero, sem liberar verba', () => {
    const amounts = readPaBudgetAmounts({
      verba_total: 500,
      verba_reservada: 0,
      verba_comprometida: 100,
      verba_consumida: 400,
    });

    expect(amounts.disponivel).toBe(0);
    expect(amounts.percentualOcupado).toBe(100);
  });

  it('cai para verba_total quando a base ainda nao tem verba_planejada', () => {
    const amounts = readPaBudgetAmounts({ verba_total: 800, verba_consumida: 300 });

    expect(amounts.planejada).toBe(800);
    expect(amounts.disponivel).toBe(500);
  });

  it('nao divide por zero quando a competencia nao tem verba', () => {
    const amounts = readPaBudgetAmounts({ verba_total: 0, verba_consumida: 0 });

    expect(amounts.percentualOcupado).toBe(0);
    expect(amounts.disponivel).toBe(0);
  });

  it('aceita orcamento ausente', () => {
    const amounts = readPaBudgetAmounts(null);

    expect(amounts).toMatchObject({
      planejada: 0,
      ocupada: 0,
      disponivel: 0,
      percentualOcupado: 0,
    });
  });

  it('soma valor gravado como string, padrao do PostgREST para numeric', () => {
    const amounts = readPaBudgetAmounts({
      verba_planejada: '1000.50' as unknown as number,
      verba_reservada: '0.25' as unknown as number,
      verba_consumida: '0.25' as unknown as number,
    });

    expect(amounts.disponivel).toBeCloseTo(1000, 2);
  });
});
