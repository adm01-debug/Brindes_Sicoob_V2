import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  EXTERNAL_ACTIVE_PRODUCT_FILTER,
  EXTERNAL_PRODUCT_CORE_SELECT,
  EXTERNAL_PRODUCT_LIGHTWEIGHT_SELECT,
  EXTERNAL_PRODUCT_REORDER_SELECT,
} from './external-product-contract.ts';

const FORBIDDEN_LEGACY_COLUMNS = ['active', 'base_price', 'image_url'];

function columns(select: string): string[] {
  return select.split(',').map((column) => column.trim());
}

Deno.test('contrato externo não consulta aliases legados inexistentes', () => {
  for (const select of [
    EXTERNAL_PRODUCT_CORE_SELECT,
    EXTERNAL_PRODUCT_LIGHTWEIGHT_SELECT,
    EXTERNAL_PRODUCT_REORDER_SELECT,
  ]) {
    const selected = columns(select);
    assertEquals(new Set(selected).size, selected.length, 'o select não pode repetir colunas');
    for (const forbidden of FORBIDDEN_LEGACY_COLUMNS) {
      assert(!selected.includes(forbidden), `coluna legada proibida no catálogo: ${forbidden}`);
    }
  }
});

Deno.test('contrato externo usa somente is_active para produto ativo', () => {
  assertEquals(EXTERNAL_ACTIVE_PRODUCT_FILTER, { is_active: true });
  assert(columns(EXTERNAL_PRODUCT_CORE_SELECT).includes('is_active'));
});
