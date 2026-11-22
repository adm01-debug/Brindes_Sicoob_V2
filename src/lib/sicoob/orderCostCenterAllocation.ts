export interface AllocationRowInput {
  cost_center_id: string;
  valor: string;
}

export interface AllocationPayloadItem {
  cost_center_id: string;
  valor: number;
  percentual: number;
}

/**
 * Arredondar cada linha isoladamente nao fecha 100 em rateios de tres ou mais
 * centros (3 x 33.33 = 99.99; 6 x 16.67 = 100.02) e o banco rejeita a soma
 * fora de 0,01. A ultima linha absorve o resto do arredondamento.
 */
export function buildAllocationPayload(
  orderTotal: number,
  rows: AllocationRowInput[],
): AllocationPayloadItem[] {
  const selecionados = rows.map((row) => row.cost_center_id).filter(Boolean);
  if (selecionados.length !== rows.length) {
    throw new Error('Selecione o centro de custo de cada linha do rateio.');
  }
  if (new Set(selecionados).size !== selecionados.length) {
    throw new Error('Cada centro de custo pode aparecer uma unica vez no rateio.');
  }

  let percentualAcumulado = 0;
  return rows.map((row, index) => {
    const valor = Number(row.valor) || 0;
    const ultima = index === rows.length - 1;
    const percentual =
      orderTotal > 0
        ? ultima
          ? Number((100 - percentualAcumulado).toFixed(2))
          : Number((Math.round((valor / orderTotal) * 10000) / 100).toFixed(2))
        : 0;
    percentualAcumulado = Number((percentualAcumulado + percentual).toFixed(2));
    return { cost_center_id: row.cost_center_id, valor, percentual };
  });
}
