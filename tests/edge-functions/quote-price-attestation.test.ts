import { describe, expect, it } from 'vitest';
import {
  readBoundedBody,
  unwrapSuccessfulRpcEnvelope,
  verifyQuoteCatalogItem,
  type AttestableQuoteItem,
  type QuoteCatalogProduct,
  type QuoteCatalogVariant,
} from '../../supabase/functions/quote-price-attestation/contract';

const product: QuoteCatalogProduct = {
  id: 'produto-1',
  name: 'Caneca vigente',
  sku: 'CAN',
  sale_price: 10,
  primary_image_url: null,
  is_active: true,
};

const variant: QuoteCatalogVariant = {
  id: 'variante-1',
  product_id: 'produto-1',
  sku: 'CAN-VD',
  supplier_sku: 'FORN-VD',
  sale_price: 12.5,
  color_name: 'Verde',
  color_hex: '#00A091',
  size_code: null,
  selected_thumbnail: null,
  is_active: true,
};

function item(overrides: Partial<AttestableQuoteItem> = {}): AttestableQuoteItem {
  return {
    product_id: 'produto-1',
    product_name: 'Caneca vigente',
    product_sku: 'CAN',
    quantity: 2,
    unit_price: 10,
    unit_cost: 7,
    personalizations: [],
    ...overrides,
  };
}

describe('atestação de preço do orçamento', () => {
  it('limita o corpo da solicitação enquanto lê o stream', async () => {
    const tooLarge = new Request('https://example.test', {
      method: 'POST',
      headers: { 'content-length': '5' },
      body: '12345',
    });
    const bounded = new Request('https://example.test', { method: 'POST', body: '1234' });
    await expect(readBoundedBody(tooLarge, 4)).resolves.toBeNull();
    await expect(readBoundedBody(bounded, 4)).resolves.toBe('1234');
  });

  it('desembrulha RPCs diretas e envelopes de sucesso sem descartar o payload interno', () => {
    const payload = { success: true, quantidade: 10, preco_unitario: 2 };
    expect(unwrapSuccessfulRpcEnvelope(payload)).toEqual(payload);
    expect(unwrapSuccessfulRpcEnvelope({ success: true, data: payload })).toEqual(payload);
    expect(unwrapSuccessfulRpcEnvelope({ success: true, data: { success: true, data: payload } }))
      .toEqual(payload);
    expect(unwrapSuccessfulRpcEnvelope({ data: payload })).toEqual({ data: payload });
  });

  it('aceita somente o preço vigente do produto e deriva custo conforme a regra do editor', () => {
    expect(verifyQuoteCatalogItem(item(), product, undefined, undefined)).toEqual({
      unitPrice: 10,
      unitCost: 7,
      snapshotPreserved: false,
    });
  });

  it('usa o custo vigente do produto quando ele difere do percentual estimado', () => {
    expect(verifyQuoteCatalogItem(
      item({ unit_cost: 5.25 }), { ...product, cost_price: 5.25 }, undefined, undefined,
    )).toMatchObject({ unitPrice: 10, unitCost: 5.25, snapshotPreserved: false });
  });

  it('recusa preço unitário adulterado mesmo que o cliente recalcule os totais', () => {
    expect(() => verifyQuoteCatalogItem(item({ unit_price: 0.01, unit_cost: 0 }), product, undefined, undefined))
      .toThrow('Preço ou custo do item diverge');
  });

  it('recusa custo de produto adulterado', () => {
    expect(() => verifyQuoteCatalogItem(item({ unit_cost: 0.01 }), product, undefined, undefined))
      .toThrow('Preço ou custo do item diverge');
  });

  it('recusa produto sem preço vigente em vez de converter null em zero', () => {
    expect(() => verifyQuoteCatalogItem(
      item({ unit_price: 0, unit_cost: 0 }), { ...product, sale_price: null }, undefined, undefined,
    )).toThrow('Preço unitário indisponível');
  });

  it('não aceita diferença fracionária de centavo que seria persistida no banco', () => {
    expect(() => verifyQuoteCatalogItem(item({ unit_price: 10.004 }), product, undefined, undefined))
      .toThrow('Preço ou custo do item diverge');
  });

  it('usa preço vigente da variante e valida seu vínculo com o produto', () => {
    const variantItem = item({
      source_variant_id: 'variante-1',
      source_variant_sku: 'FORN-VD',
      product_sku: 'CAN',
      color_name: 'Verde',
      color_hex: '#00A091',
      size_code: null,
      unit_price: 12.5,
      unit_cost: 8.75,
    });
    expect(verifyQuoteCatalogItem(variantItem, product, variant, undefined)).toMatchObject({
      unitPrice: 12.5,
      unitCost: 8.75,
      snapshotPreserved: false,
    });
    expect(() => verifyQuoteCatalogItem(variantItem, product, { ...variant, product_id: 'outro-produto' }, undefined))
      .toThrow('variante');
  });

  it('recusa SKU ou atributos de variante que não correspondem ao catálogo', () => {
    const variantItem = item({
      source_variant_id: 'variante-1',
      source_variant_sku: 'FORN-VD',
      product_sku: 'CAN',
      color_name: 'Verde',
      color_hex: '#00A091',
      unit_price: 12.5,
      unit_cost: 8.75,
    });
    expect(() => verifyQuoteCatalogItem(
      { ...variantItem, color_name: 'Vermelho' }, product, variant, undefined,
    )).toThrow('identidade da variante');
    expect(() => verifyQuoteCatalogItem(
      item({ product_sku: 'SKU-ADULTERADO' }), product, undefined, undefined,
    )).toThrow('SKU do produto diverge');
  });

  it('aceita apenas imagens presentes no catálogo para itens novos ou alterados', () => {
    expect(() => verifyQuoteCatalogItem(
      item({ product_image_url: 'https://atacante.invalid/imagem.png' }),
      { ...product, primary_image_url: 'https://catalogo.test/caneca.png' },
      undefined,
      undefined,
    )).toThrow('imagem do produto diverge');
    expect(verifyQuoteCatalogItem(
      item({ product_image_url: 'https://catalogo.test/caneca.png' }),
      { ...product, primary_image_url: 'https://catalogo.test/caneca.png' },
      undefined,
      undefined,
    )).toMatchObject({ snapshotPreserved: false });
  });

  it('usa o custo estimado arredondado para centavos em produtos sem custo cadastrado', () => {
    expect(verifyQuoteCatalogItem(
      item({ unit_price: 9.99, unit_cost: 6.99 }),
      { ...product, sale_price: 9.99, cost_price: null }, undefined, undefined,
    )).toMatchObject({ unitPrice: 9.99, unitCost: 6.99 });
  });

  it.each([[1.45, 1.02], [0.05, 0.04]])(
    'calcula custo estimado com regra idêntica para preço %s',
    (unitPrice, expectedCost) => {
      expect(verifyQuoteCatalogItem(
        item({ unit_price: unitPrice, unit_cost: expectedCost }),
        { ...product, sale_price: unitPrice, cost_price: null }, undefined, undefined,
      ).unitCost).toBe(expectedCost);
    },
  );

  it('usa SKU da variante quando não há SKU de fornecedor e preserva variante sem SKU', () => {
    const semSkuFornecedor = { ...variant, supplier_sku: null };
    expect(verifyQuoteCatalogItem(item({
      source_variant_id: 'variante-1',
      source_variant_sku: 'CAN-VD',
      color_name: 'Verde',
      color_hex: '#00A091',
      unit_price: 12.5,
      unit_cost: 8.75,
    }), product, semSkuFornecedor, undefined).snapshotPreserved).toBe(false);

    expect(verifyQuoteCatalogItem(item({
      source_variant_id: 'variante-1',
      source_variant_sku: null,
      color_name: 'Verde',
      color_hex: '#00A091',
      unit_price: 12.5,
      unit_cost: 8.75,
    }), product, { ...semSkuFornecedor, sku: null }, undefined).snapshotPreserved).toBe(false);
  });

  it('permite editar quantidade de linha antiga mantendo o snapshot imutável de SKU', () => {
    const oldItem = item({
      source_variant_id: 'variante-1',
      source_variant_sku: 'CAN-VD',
      product_sku: 'CAN-VD',
      color_name: 'Verde',
      color_hex: '#00A091',
      unit_price: 12.5,
      unit_cost: 8.75,
    });
    const oldSnapshot = {
      product_id: oldItem.product_id,
      source_variant_id: oldItem.source_variant_id ?? null,
      unit_price: oldItem.unit_price,
      unit_cost: oldItem.unit_cost,
      quantity: oldItem.quantity,
      product_name: oldItem.product_name,
      product_sku: oldItem.product_sku,
      source_variant_sku: oldItem.source_variant_sku,
      color_name: oldItem.color_name,
      color_hex: oldItem.color_hex,
    };
    expect(verifyQuoteCatalogItem(
      { ...oldItem, quantity: 3 }, product, variant, oldSnapshot,
    )).toMatchObject({ unitPrice: 12.5, unitCost: 8.75, snapshotPreserved: false });
  });

  it('preserva o snapshot anterior quando produto e preço do item não mudaram', () => {
    const oldSnapshot = {
      product_id: 'produto-1',
      source_variant_id: null,
      unit_price: 9,
      unit_cost: 6.3,
      quantity: 2,
    };
    expect(verifyQuoteCatalogItem(
      item({ unit_price: 9, unit_cost: 6.3 }),
      { ...product, sale_price: 20, is_active: false },
      undefined,
      oldSnapshot,
    )).toEqual({ unitPrice: 9, unitCost: 6.3, snapshotPreserved: true });
  });

  it('não permite converter uma edição manual em snapshot histórico', () => {
    const oldSnapshot = {
      product_id: 'produto-1',
      source_variant_id: null,
      unit_price: 9,
      unit_cost: 6.3,
      quantity: 2,
    };
    expect(() => verifyQuoteCatalogItem(
      item({ unit_price: 8, unit_cost: 5.6 }), product, undefined, oldSnapshot,
    )).toThrow('Preço ou custo do item diverge');
  });

  it('não preserva identidade textual adulterada em snapshot histórico', () => {
    expect(() => verifyQuoteCatalogItem(
      item({ product_name: 'Produto diferente' }), product, undefined, {
        product_id: 'produto-1',
        source_variant_id: null,
        unit_price: 10,
        unit_cost: 7,
        quantity: 2,
        product_name: 'Caneca vigente',
      },
    )).toThrow('nome do produto diverge');
  });

  it('revalida o preço se a quantidade do snapshot mudar', () => {
    expect(() => verifyQuoteCatalogItem(
      item({ quantity: 3, unit_price: 9, unit_cost: 6.3 }), product, undefined, {
        product_id: 'produto-1',
        source_variant_id: null,
        unit_price: 9,
        unit_cost: 6.3,
        quantity: 2,
      },
    )).toThrow('Preço ou custo do item diverge');
  });
});
