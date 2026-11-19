/**
 * Regressão: a exclusão do que o cliente já compra estava dentro da consulta,
 * cujo cache (10 min) não inclui a afinidade. Com a afinidade falhando na
 * abertura, o "Tentar novamente" devolvia produto já comprado como oportunidade.
 */
import { describe, expect, it } from 'vitest';
import { excluirJaComprados } from '@/components/bi/ClientLookalikes';

const linha = (id: string, nome: string) => ({
  product_id: id, product_name: nome, product_image_url: null,
  total_quantity: 10, unique_clients: 3, total_revenue: 1000, avg_unit_price: 100,
});

describe('excluirJaComprados', () => {
  it('exclui por id e por nome, com a afinidade do momento da renderização', () => {
    const rows = [linha('p1', 'Garrafa Térmica'), linha('p2', 'Caneta Metal'), linha('p3', 'Mochila')];

    const semAfinidade = excluirJaComprados(rows, new Set(), new Set());
    expect(semAfinidade).toHaveLength(3);

    const comAfinidade = excluirJaComprados(rows, new Set(['p1']), new Set(['caneta metal']));
    expect(comAfinidade.map((r) => r.product_id)).toEqual(['p3']);
  });

  it('limita a seis sugestões', () => {
    const rows = Array.from({ length: 12 }, (_, i) => linha(`p${i}`, `Produto ${i}`));
    expect(excluirJaComprados(rows, new Set(), new Set())).toHaveLength(6);
  });
});
