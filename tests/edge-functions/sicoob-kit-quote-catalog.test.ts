import { describe, expect, it } from 'vitest';
import {
  buildVerifiedKitLines,
  buildVerifiedPersonalization,
  assertCompleteVariantCatalog,
  type CatalogProduct,
  type CatalogVariant,
  type KitLineRequest,
} from '../../supabase/functions/sicoob-kit-quote/catalog';

const checkedAt = '2026-09-12T22:00:00.000Z';
const products: CatalogProduct[] = [
  {
    id: 'box-1', name: 'Caixa vigente', sku: 'BOX', sale_price: 12,
    primary_image_url: null, is_active: true, stock_quantity: 100, min_quantity: 1,
  },
  {
    id: 'product-1', name: 'Caneca vigente', sku: 'CAN', sale_price: 20,
    primary_image_url: null, is_active: true, stock_quantity: 100, min_quantity: 5,
  },
];
const variants: CatalogVariant[] = [
  {
    id: 'variant-1', product_id: 'product-1', sku: 'CAN-VD', sale_price: 24.5,
    color_name: 'Verde', color_hex: '#00A091', size_code: null,
    stock_quantity: 10, selected_thumbnail: null, is_active: true,
  },
  {
    id: 'variant-2', product_id: 'product-1', sku: 'CAN-AZ', sale_price: 25,
    color_name: 'Azul', color_hex: '#003641', size_code: null,
    stock_quantity: 4, selected_thumbnail: null, is_active: true,
  },
];

function lines(itemOverrides: Partial<KitLineRequest> = {}): KitLineRequest[] {
  return [
    { lineId: 'box', productId: 'box-1', unitsPerKit: 1, kind: 'box' },
    { lineId: 'item:0', productId: 'product-1', variantId: 'variant-1', unitsPerKit: 2, kind: 'item', ...itemOverrides },
  ];
}

describe('catálogo servidor da conversão de kit', () => {
  it('exige contagem exata para impedir validação sobre resposta truncada', () => {
    expect(() => assertCompleteVariantCatalog(null, variants)).toThrow('contagem exata');
    expect(() => assertCompleteVariantCatalog(3, variants)).toThrow('variantes demais');
    expect(() => assertCompleteVariantCatalog(variants.length, variants)).not.toThrow();
  });

  it('usa nome, SKU e preço vigentes da variante', () => {
    const verified = buildVerifiedKitLines(lines(), products, variants, 3, checkedAt);
    expect(verified[1]).toMatchObject({
      product_name: 'Caneca vigente',
      product_sku: 'CAN-VD',
      quantity: 6,
      unit_price: 24.5,
      source_variant_id: 'variant-1',
    });
  });

  it('agrega duas linhas da mesma variante antes de validar o saldo', () => {
    const duplicated = [
      ...lines(),
      { lineId: 'item:1', productId: 'product-1', variantId: 'variant-1', unitsPerKit: 2, kind: 'item' as const },
    ];
    expect(() => buildVerifiedKitLines(duplicated, products, variants, 3, checkedAt)).toThrow('Estoque insuficiente');
  });

  it('valida a quantidade mínima pela soma das linhas do produto', () => {
    const splitMinimum = [
      ...lines({ unitsPerKit: 3 }),
      { lineId: 'item:1', productId: 'product-1', variantId: 'variant-1', unitsPerKit: 3, kind: 'item' as const },
    ];
    expect(buildVerifiedKitLines(splitMinimum, products, variants, 1, checkedAt)).toHaveLength(3);
  });

  it('usa a soma das variantes quando a composição não escolhe variante', () => {
    const verified = buildVerifiedKitLines(lines({ variantId: null }), products, variants, 7, checkedAt);
    expect(verified[1].quantity).toBe(14);
  });

  it('recusa misturar saldo agregado e variante do mesmo produto', () => {
    const mixed = [
      ...lines(),
      { lineId: 'item:1', productId: 'product-1', variantId: null, unitsPerKit: 1, kind: 'item' as const },
    ];
    expect(() => buildVerifiedKitLines(mixed, products, variants, 1, checkedAt)).toThrow('não pode misturar');
  });

  it('exige exatamente uma embalagem', () => {
    const withoutBox = lines().map((line) => ({ ...line, kind: 'item' as const }));
    expect(() => buildVerifiedKitLines(withoutBox, products, variants, 3, checkedAt)).toThrow('exatamente uma embalagem');
  });
});

describe('personalização verificada no catálogo', () => {
  const verifiedLine = buildVerifiedKitLines(lines(), products, variants, 3, checkedAt)[1];
  const options = {
    product_id: 'product-1',
    locations: [{
      location_name: 'Lado A',
      options: [{
        technique_id: 'tech-1', tecnica_nome: 'Laser vigente', max_cores: 2,
        usa_dimensao: true, efetiva_largura_max: 5, efetiva_altura_max: 4,
      }],
    }],
  };
  const price = {
    success: true,
    quantidade: 6,
    preco_unitario: 3,
    setup_total: 10,
    total_cobrado: 18,
  };

  it('persiste nome e preço devolvidos pelo catálogo', () => {
    expect(buildVerifiedPersonalization(
      { techniqueId: 'tech-1', colors: 2, width: 4, height: 3 },
      verifiedLine,
      options,
      price,
      checkedAt,
    )).toMatchObject({
      technique_name: 'Laser vigente',
      personalized_quantity: 6,
      unit_cost: 3,
      setup_cost: 10,
      total_cost: 18,
      position: 'Lado A',
    });
  });

  it('recusa técnica que não pertence ao produto', () => {
    expect(() => buildVerifiedPersonalization(
      { techniqueId: 'tech-atacante', colors: 1, width: 2, height: 2 },
      verifiedLine,
      options,
      price,
      checkedAt,
    )).toThrow('não pertence ao produto');
  });

  it('recusa total de personalização incompatível com quantidade e preço', () => {
    expect(() => buildVerifiedPersonalization(
      { techniqueId: 'tech-1', colors: 1, width: 2, height: 2 },
      verifiedLine,
      options,
      { ...price, total_cobrado: 1 },
      checkedAt,
    )).toThrow('inconsistente');
  });
});
