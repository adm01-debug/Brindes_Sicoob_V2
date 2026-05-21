import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'mock-token' } } }),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { invokeBridge, invokeExternalDb, invokeExternalDbDelete, invokeBatchBridge } from '@/lib/external-db/bridge';
import { supabase } from '@/integrations/supabase/client';

const mockInvoke = vi.mocked(supabase.functions.invoke);

// NOTE: a semântica de retry/erro/cold-start vive em `invoke.ts` (invokeWithRetry)
// e é coberta por tests/lib/external-db-invoke.test.ts. Aqui testamos apenas o
// que o wrapper fino `bridge.ts` adiciona por cima.

describe('invokeBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna o data da resposta em sucesso', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, data: { records: [], count: 0 } },
      error: null,
    });

    const result = await invokeBridge({ table: 'products', operation: 'select' });
    expect(result.success).toBe(true);
  });

  it('permite operação batch sem table', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, data: { results: [{ success: true, data: { records: [], count: 0 } }] } },
      error: null,
    });

    const result = await invokeBridge({ operation: 'batch', queries: [] });
    expect(result.success).toBe(true);
  });
});

describe('invokeExternalDb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('embrulha respostas não-record de mutações em { records, count }', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, data: { id: 'new-1', name: 'Test' } },
      error: null,
    });

    const result = await invokeExternalDb({
      table: 'products',
      operation: 'insert',
      data: { name: 'Test' },
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toEqual({ id: 'new-1', name: 'Test' });
    expect(result.count).toBe(1);
  });

  it('repassa array de records para select', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, data: { records: [{ id: '1' }, { id: '2' }], count: 2 } },
      error: null,
    });

    const result = await invokeExternalDb({ table: 'products', operation: 'select' });

    expect(result.records).toHaveLength(2);
    expect(result.count).toBe(2);
  });
});

describe('invokeExternalDbDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama a bridge com operação delete e o body correto', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, data: { deleted_id: 'del-1' } },
      error: null,
    });

    await invokeExternalDbDelete('products', 'del-1');
    // O cliente injeta headers de correlação (request-id/traceparent), então
    // validamos apenas o nome da função e o body via objectContaining.
    expect(mockInvoke).toHaveBeenCalledWith(
      'external-db-bridge',
      expect.objectContaining({
        body: { table: 'products', operation: 'delete', id: 'del-1' },
      }),
    );
  });
});

describe('invokeBatchBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envia todas as queries em uma chamada quando abaixo do limite', async () => {
    const queries = Array.from({ length: 5 }, (_, i) => ({
      table: `table_${i}`,
      operation: 'select' as const,
    }));

    mockInvoke.mockResolvedValue({
      data: {
        success: true,
        data: {
          results: queries.map(() => ({ success: true, data: { records: [], count: 0 } })),
        },
      },
      error: null,
    });

    const results = await invokeBatchBridge(queries);
    expect(results).toHaveLength(5);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('fragmenta queries acima do limite de batch', async () => {
    const queries = Array.from({ length: 15 }, (_, i) => ({
      table: `table_${i}`,
      operation: 'select' as const,
    }));

    mockInvoke.mockResolvedValueOnce({
      data: {
        success: true,
        data: { results: Array.from({ length: 10 }, () => ({ success: true, data: { records: [], count: 0 } })) },
      },
      error: null,
    });
    mockInvoke.mockResolvedValueOnce({
      data: {
        success: true,
        data: { results: Array.from({ length: 5 }, () => ({ success: true, data: { records: [], count: 0 } })) },
      },
      error: null,
    });

    const results = await invokeBatchBridge(queries);
    expect(results).toHaveLength(15);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });
});
