/**
 * O selo de prazo só aparece se a coluna for PEDIDA.
 *
 * Os testes de `supplier-trust-badges` alimentam `leadTimeDays` à mão — estado
 * que a ficha real nunca produziu, porque `lead_time_days` não estava em
 * nenhum dos selects. O resultado é que eles passavam em verde com a tela
 * exibindo exatamente o que exibia antes. Este arquivo cobre o trecho que
 * faltava: recorta a linha do catálogo PELAS colunas do select (é o que o
 * PostgREST faz) e segue até o que o componente recebe.
 */
import { describe, expect, it } from 'vitest';
import { PRODUCT_SELECT_FIELDS_DETAIL } from '@/lib/external-db/product-types';
import { mapPromobrindToProduct } from '@/utils/product-mapper';
import { supplierTrustFromProduct } from '@/pages/product-detail/ProductDetailHeroSections';

/** Linha completa do catálogo; `lead_time_days` medido em produção (2, 3 ou 5). */
const LINHA_DO_CATALOGO: Record<string, unknown> = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Caneca cerâmica',
  sku: 'SKU-1',
  sale_price: 19.9,
  cost_price: 9.9,
  is_active: true,
  lead_time_days: 2,
};

/** O que o PostgREST devolve: só as colunas do `select`. */
function recortarPeloSelect(linha: Record<string, unknown>, select: string) {
  const colunas = new Set(select.split(',').map((c) => c.trim()));
  return Object.fromEntries(Object.entries(linha).filter(([coluna]) => colunas.has(coluna)));
}

describe('prazo de entrega chega à ficha do produto', () => {
  it('o select da ficha pede lead_time_days', () => {
    expect(PRODUCT_SELECT_FIELDS_DETAIL.split(',').map((c) => c.trim())).toContain('lead_time_days');
  });

  it('o prazo sobrevive ao recorte do select, ao mapper e ao cálculo do selo', () => {
    const recortada = recortarPeloSelect(LINHA_DO_CATALOGO, PRODUCT_SELECT_FIELDS_DETAIL);
    expect(recortada.lead_time_days).toBe(2);

    const produto = mapPromobrindToProduct(recortada as never);
    expect(produto.leadTimeDays).toBe(2);
    expect(supplierTrustFromProduct(produto).deliveryDays).toBe(2);
  });

  it('sem a coluna no select, o selo some — é a regressão que este teste trava', () => {
    const semPrazo = recortarPeloSelect(LINHA_DO_CATALOGO, 'id, name, sku, sale_price');
    const produto = mapPromobrindToProduct(semPrazo as never);
    expect(produto.leadTimeDays).toBeNull();
    expect(supplierTrustFromProduct(produto).deliveryDays).toBeNull();
  });
});
