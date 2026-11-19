/**
 * Regressão: sem nenhuma categoria do setor, os exportadores recebiam a lista
 * vazia como fonte real — o PDF imprimia "0.0%" para o setor e o PPTX afirmava
 * "cliente alinhado ao mix do setor". Ausência de comparativo voltava a
 * aparecer como diagnóstico medido.
 */
import { describe, expect, it } from 'vitest';
import { buildCategorySection } from '@/lib/bi/executive-summary';

const categoriaDoCliente = {
  slug: 'garrafas',
  label: 'Garrafas',
  revenueSharePct: 100,
  occurrences: 2,
  totalQuantity: 20,
  totalRevenue: 1000,
  revenueRecent: 1000,
  revenuePrevious: 0,
  deltaPct: null,
  trend: 'stable' as const,
  topProducts: [],
};

const afinidade = {
  isMock: false,
  realProductsCount: 2,
  categories: [categoriaDoCliente],
  favorite: categoriaDoCliente,
};

describe('buildCategorySection — setor sem categorias', () => {
  it('marca o comparativo como indisponível em vez de preencher com zero', () => {
    const secao = buildCategorySection(afinidade, { isMock: false, companiesInRamo: 3, categories: [] });

    expect(secao.industryUnavailable).toBe(true);
    expect(secao.rows).toHaveLength(1);
    expect(secao.rows[0]?.industrySharePct).toBeNull();
    expect(secao.gaps).toEqual([]);
  });

  it('com o setor respondendo, o percentual volta a ser número', () => {
    const secao = buildCategorySection(afinidade, {
      isMock: false,
      companiesInRamo: 3,
      categories: [{ slug: 'garrafas', label: 'Garrafas', revenueSharePct: 40, topProducts: [] }],
    });

    expect(secao.industryUnavailable).toBe(false);
    expect(secao.rows[0]?.industrySharePct).toBe(40);
  });

  it('o percentual do cliente continua sendo mostrado — ele foi medido', () => {
    const secao = buildCategorySection(afinidade, { isMock: false, companiesInRamo: 0, categories: [] });

    expect(secao.rows[0]?.clientSharePct).toBe(100);
    expect(secao.favoriteLabel).toBe('Garrafas');
  });
});
