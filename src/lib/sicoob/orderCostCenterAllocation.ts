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
 *
 * O mesmo vale para `valor`: o banco cobra a soma exata do pedido, entao o
 * centavo do arredondamento de 199,99 em um pedido de 200,00 tambem precisa
 * cair na ultima linha. Os dois campos sao corrigidos juntos para nao existir
 * estado onde `percentual` e `valor` apontam para totais diferentes.
 */
/**
 * Distribui a diferenca de arredondamento entre as linhas, da ultima para a
 * primeira. Descontar sempre da ultima deixava parcela negativa quando ela
 * estava zerada (300,01 + 0,00 em pedido de 300,00 mandava -0,01) e o banco
 * recusava o rateio inteiro; aqui a linha que nao comporta o desconto zera e o
 * resto segue para quem tem saldo.
 */
function ajustarDiferenca(valores: number[], total: number): number[] {
  if (total <= 0) return valores;
  const ajustados = [...valores];
  let falta = Number((total - ajustados.reduce((soma, v) => soma + v, 0)).toFixed(2));
  for (let i = ajustados.length - 1; i >= 0 && falta !== 0; i -= 1) {
    const atual = ajustados[i] ?? 0;
    const alvo = Number((atual + falta).toFixed(2));
    if (alvo >= 0) {
      ajustados[i] = alvo;
      falta = 0;
    } else {
      falta = Number((falta + atual).toFixed(2));
      ajustados[i] = 0;
    }
  }
  return ajustados;
}

function validarCentros(rows: AllocationRowInput[]): void {
  const selecionados = rows.map((row) => row.cost_center_id).filter(Boolean);
  if (selecionados.length !== rows.length) {
    throw new Error('Selecione o centro de custo de cada linha do rateio.');
  }
  if (new Set(selecionados).size !== selecionados.length) {
    throw new Error('Cada centro de custo pode aparecer uma unica vez no rateio.');
  }
}

/**
 * Arredondar cada linha isoladamente nao fecha 100 em rateios de tres ou mais
 * centros (3 x 33.33 = 99.99; 6 x 16.67 = 100.02) e o banco rejeita a soma
 * fora de 0,01. A ultima linha absorve o resto do arredondamento.
 *
 * O mesmo vale para `valor`: o banco cobra a soma exata do pedido, entao o
 * centavo do arredondamento de 199,99 em um pedido de 200,00 tambem precisa
 * cair na ultima linha. Os dois campos sao corrigidos juntos para nao existir
 * estado onde `percentual` e `valor` apontam para totais diferentes.
 */
export function buildAllocationPayload(
  orderTotal: number,
  rows: AllocationRowInput[],
): AllocationPayloadItem[] {
  validarCentros(rows);
  const total = Number(orderTotal) > 0 ? Number(orderTotal) : 0;
  const valores = ajustarDiferenca(
    rows.map((row) => Number((Number(row.valor) || 0).toFixed(2))),
    total,
  );

  let percentualAcumulado = 0;
  return rows.map((row, index) => {
    const valor = valores[index] ?? 0;
    const ultima = index === rows.length - 1;
    const percentual =
      total > 0
        ? ultima
          ? Number((100 - percentualAcumulado).toFixed(2))
          : Number((Math.round((valor / total) * 10000) / 100).toFixed(2))
        : 0;
    percentualAcumulado = Number((percentualAcumulado + percentual).toFixed(2));
    return { cost_center_id: row.cost_center_id, valor, percentual };
  });
}
