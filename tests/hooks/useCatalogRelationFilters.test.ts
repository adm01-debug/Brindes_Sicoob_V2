import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeExternalDb } = vi.hoisted(() => ({
  invokeExternalDb: vi.fn(),
}));

vi.mock('@/lib/external-db', () => ({
  invokeExternalDb,
}));

import {
  fetchAvailableCatalogSizes,
  fetchActivityProductIds,
  fetchRelationProductIds,
} from '@/hooks/useCatalogRelationFilters';

describe('filtros relacionais do catálogo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pagina todos os vínculos e elimina produtos duplicados', async () => {
    invokeExternalDb
      .mockResolvedValueOnce({
        records: Array.from({ length: 500 }, (_, index) => ({ product_id: `produto-${index}` })),
      })
      .mockResolvedValueOnce({
        records: [{ product_id: 'produto-499' }, { product_id: 'produto-500' }],
      });

    const ids = await fetchRelationProductIds({
      table: 'product_tags',
      column: 'tag_id',
      values: ['tag-b', 'tag-a', 'tag-a'],
    });

    expect(ids).toHaveLength(501);
    expect(invokeExternalDb).toHaveBeenNthCalledWith(1, expect.objectContaining({
      filters: { tag_id: ['tag-a', 'tag-b'] },
      limit: 500,
      offset: 0,
    }));
    expect(invokeExternalDb).toHaveBeenNthCalledWith(2, expect.objectContaining({ offset: 500 }));
  });

  it('carrega somente valores ligados ao tipo tamanho', async () => {
    invokeExternalDb
      .mockResolvedValueOnce({ records: [
        { id: 'tipo-tamanho', name: 'Tamanho' },
        { id: 'tipo-cor', name: 'Cor' },
      ] })
      .mockResolvedValueOnce({ records: [
        { variation_type_id: 'tipo-tamanho', label: 'Médio', value: 'M' },
        { variation_type_id: 'tipo-tamanho', label: 'G', value: 'G' },
        { variation_type_id: 'tipo-cor', label: 'Azul', value: 'azul' },
      ] });

    await expect(fetchAvailableCatalogSizes()).resolves.toEqual(['M', 'G']);
  });

  it('resolve ramos e segmentos antes de buscar os produtos vinculados', async () => {
    invokeExternalDb
      .mockResolvedValueOnce({ records: [{ id: 'ramo-1', slug: 'cooperativismo' }] })
      .mockResolvedValueOnce({ records: [
        { id: 'segmento-1', slug: 'credito', ramo_atividade_id: 'ramo-1' },
        { id: 'segmento-2', slug: 'seguros', ramo_atividade_id: 'ramo-2' },
      ] })
      .mockResolvedValueOnce({ records: [{ produto_id: 'produto-1' }] });

    await expect(fetchActivityProductIds(['cooperativismo'], [])).resolves.toEqual(['produto-1']);
    expect(invokeExternalDb).toHaveBeenCalledWith(expect.objectContaining({
      table: 'produto_ramo_atividade',
      select: 'produto_id',
      filters: { ramo_atividade_filho_id: ['segmento-1'] },
    }));
  });
});
