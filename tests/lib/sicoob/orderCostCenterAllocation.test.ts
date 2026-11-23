/**
 * Tests for buildAllocationPayload em src/lib/sicoob/orderCostCenterAllocation.ts
 * O rateio precisa fechar 100% exato: o validador do banco recusa soma fora de 0,01.
 */
import { describe, it, expect } from 'vitest';
import { buildAllocationPayload } from '@/lib/sicoob/orderCostCenterAllocation';

const somaPercentual = (itens: { percentual: number }[]) =>
  itens.reduce((soma, item) => soma + item.percentual, 0);

describe('buildAllocationPayload', () => {
  it('fecha 100,00 em rateio de tres centros iguais', () => {
    const payload = buildAllocationPayload(300, [
      { cost_center_id: 'a', valor: '100' },
      { cost_center_id: 'b', valor: '100' },
      { cost_center_id: 'c', valor: '100' },
    ]);

    expect(payload.map((item) => item.percentual)).toEqual([33.33, 33.33, 33.34]);
    expect(somaPercentual(payload)).toBeCloseTo(100, 2);
  });

  it('fecha 100,00 em rateio de seis centros iguais', () => {
    const payload = buildAllocationPayload(600, [
      { cost_center_id: 'a', valor: '100' },
      { cost_center_id: 'b', valor: '100' },
      { cost_center_id: 'c', valor: '100' },
      { cost_center_id: 'd', valor: '100' },
      { cost_center_id: 'e', valor: '100' },
      { cost_center_id: 'f', valor: '100' },
    ]);

    // 5 x 16.67 = 83,35; a ultima linha absorve o resto e fecha 100,00 exato.
    expect(payload.slice(0, 5).map((item) => item.percentual)).toEqual([
      16.67, 16.67, 16.67, 16.67, 16.67,
    ]);
    expect(payload[5].percentual).toBe(16.65);
    expect(somaPercentual(payload)).toBe(100);
  });

  it('fecha 100,00 em rateio de sete centros iguais', () => {
    const payload = buildAllocationPayload(700, [
      { cost_center_id: 'a', valor: '100' },
      { cost_center_id: 'b', valor: '100' },
      { cost_center_id: 'c', valor: '100' },
      { cost_center_id: 'd', valor: '100' },
      { cost_center_id: 'e', valor: '100' },
      { cost_center_id: 'f', valor: '100' },
      { cost_center_id: 'g', valor: '100' },
    ]);

    expect(somaPercentual(payload)).toBeCloseTo(100, 2);
  });

  it('preserva o valor informado de cada linha', () => {
    const payload = buildAllocationPayload(200, [
      { cost_center_id: 'a', valor: '150' },
      { cost_center_id: 'b', valor: '50' },
    ]);

    expect(payload.map((item) => item.valor)).toEqual([150, 50]);
    expect(payload.map((item) => item.percentual)).toEqual([75, 25]);
  });

  it('fecha o valor do pedido mesmo quando o centavo sobra na ultima linha', () => {
    // O banco cobra a soma exata no caminho estrito: 66,67 + 66,67 + 66,66.
    const payload = buildAllocationPayload(200, [
      { cost_center_id: 'a', valor: '66.67' },
      { cost_center_id: 'b', valor: '66.67' },
      { cost_center_id: 'c', valor: '66.66' },
    ]);

    expect(payload.map((item) => item.valor)).toEqual([66.67, 66.67, 66.66]);
    expect(payload.reduce((soma, item) => soma + item.valor, 0)).toBe(200);
    expect(somaPercentual(payload)).toBe(100);
  });

  it('absorve no valor da ultima linha o centavo que faltava', () => {
    // 199,99 digitado em um pedido de 200,00: o banco recusaria a soma.
    const payload = buildAllocationPayload(200, [
      { cost_center_id: 'a', valor: '99.99' },
      { cost_center_id: 'b', valor: '99.99' },
    ]);

    expect(payload.map((item) => item.valor)).toEqual([99.99, 100.01]);
    expect(payload.reduce((soma, item) => soma + item.valor, 0)).toBe(200);
    expect(somaPercentual(payload)).toBe(100);
  });

  it('nao envia parcela negativa quando o excesso cai numa linha zerada', () => {
    // Pedido de 300 com 300,01 na primeira linha e 0,00 na segunda: descontar
    // o centavo da ultima a deixaria em -0,01 e o banco recusaria o rateio.
    const payload = buildAllocationPayload(300, [
      { cost_center_id: 'a', valor: '300.01' },
      { cost_center_id: 'b', valor: '0' },
    ]);

    expect(payload.map((item) => item.valor)).toEqual([300, 0]);
    expect(payload.every((item) => item.valor >= 0)).toBe(true);
    expect(payload.reduce((soma, item) => soma + item.valor, 0)).toBeCloseTo(300, 2);
  });

  it('rejeita linha sem centro de custo', () => {
    expect(() =>
      buildAllocationPayload(100, [
        { cost_center_id: 'a', valor: '50' },
        { cost_center_id: '', valor: '50' },
      ]),
    ).toThrow(/Selecione o centro de custo/);
  });

  it('rejeita centro de custo repetido', () => {
    expect(() =>
      buildAllocationPayload(100, [
        { cost_center_id: 'a', valor: '50' },
        { cost_center_id: 'a', valor: '50' },
      ]),
    ).toThrow(/unica vez no rateio/);
  });

  it('nao divide por zero quando o pedido ainda nao tem total', () => {
    const payload = buildAllocationPayload(0, [{ cost_center_id: 'a', valor: '100' }]);

    expect(payload[0].percentual).toBe(0);
    expect(payload[0].valor).toBe(100);
  });
});
