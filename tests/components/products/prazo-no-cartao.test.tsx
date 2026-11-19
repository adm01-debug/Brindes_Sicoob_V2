/**
 * O prazo no cartão de listagem depende de DUAS pontas, e por isso o teste
 * cobre as duas: o contrato de leitura da edge precisa pedir a coluna (em
 * listagem o bridge troca o select do chamador pelo `LIGHTWEIGHT_SELECT`), e o
 * componente precisa ler o dado em vez de escrever texto fixo.
 *
 * Cobrir só o componente deixaria passar exatamente o defeito que a ficha do
 * produto teve: prop alimentado à mão no teste, campo nunca preenchido na tela.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../../..');
const contrato = readFileSync(
  resolve(ROOT, 'supabase/functions/_shared/external-product-contract.ts'),
  'utf8',
);
const cartao = readFileSync(
  resolve(ROOT, 'src/components/products/ProductHoverPreview.tsx'),
  'utf8',
);

/** Reproduz o recorte que o PostgREST faz: só as colunas pedidas voltam. */
function colunasDoSelectLeve(): string[] {
  const bloco = contrato.slice(
    contrato.indexOf('EXTERNAL_PRODUCT_LIGHTWEIGHT_SELECT'),
    contrato.indexOf(".join(',')", contrato.indexOf('EXTERNAL_PRODUCT_LIGHTWEIGHT_SELECT')),
  );
  return [...bloco.matchAll(/'([a-z_]+)'/g)].map((m) => m[1] ?? '');
}

describe('prazo de entrega no cartão de listagem', () => {
  it('o select leve da edge pede lead_time_days — sem isso o cartão não tem o dado', () => {
    expect(colunasDoSelectLeve()).toContain('lead_time_days');
  });

  it('o cartão lê o dado em vez de escrever texto fixo', () => {
    expect(cartao).toContain('{prazoDeEntrega(product)}');
    // A string só pode aparecer dentro do fallback, nunca solta no JSX.
    expect(cartao).not.toContain('<span>Consultar prazo</span>');
  });

  it('prazo zero ou ausente é "não informado", não entrega no mesmo dia', () => {
    const corpo = cartao.slice(
      cartao.indexOf('function prazoDeEntrega'),
      cartao.indexOf('function PreviewContent'),
    );
    expect(corpo).toContain('dias && dias > 0');
    expect(corpo).toContain("'Consultar prazo'");
    // Mesmo texto da ficha, para as duas telas não se contradizerem.
    expect(corpo).toContain('dias úteis');
  });
});
