/**
 * O teto da cooperativa nao pode ser gravado com upsert do PostgREST:
 * `authenticated` recebe UPDATE apenas em `verba_total, limite_alcada,
 * observacoes` (20261013115605:259-265) e o `ON CONFLICT DO UPDATE SET` inclui
 * as colunas da chave. Estes testes travam a gravacao em update-primeiro /
 * insert-depois e o total lido pela RPC, que soma tambem os PAs inativos
 * invisiveis para o gestor pela policy de leitura.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const from = vi.fn();
const rpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

import {
  cooperativaCeilingQueryKey,
  loadDistributedTotal,
  saveCeiling,
} from '@/services/sicoob/cooperativaBudgetService';

interface BuilderResult {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
}

function builder(updateResult: BuilderResult, insertResult: BuilderResult = { error: null }) {
  const chain: Record<string, unknown> = {};
  const update = vi.fn(() => chain);
  const insert = vi.fn(() => Promise.resolve(insertResult));
  Object.assign(chain, {
    update,
    insert,
    eq: vi.fn(() => chain),
    select: vi.fn(() => Promise.resolve(updateResult)),
  });
  return { chain, update, insert };
}

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: 0, error: null });
});

describe('saveCeiling', () => {
  it('atualiza a competência existente sem tentar inserir', async () => {
    const teto = builder({ data: [{ id: 'budget-1' }], error: null });
    from.mockReturnValue(teto.chain);

    await saveCeiling({ cooperativaId: 'coop-1', ano: 2026, mes: 12, verbaTotal: 5_000 });

    expect(from).toHaveBeenCalledWith('cooperativa_budgets');
    expect(teto.update).toHaveBeenCalledTimes(1);
    expect(teto.insert).not.toHaveBeenCalled();
  });

  it('insere quando a competência ainda não tem teto', async () => {
    const semTeto = builder({ data: [], error: null });
    from.mockReturnValue(semTeto.chain);

    await saveCeiling({ cooperativaId: 'coop-1', ano: 2027, mes: 1, verbaTotal: 900 });

    expect(semTeto.insert).toHaveBeenCalledTimes(1);
  });

  it('refaz o update quando outra sessão cria a linha antes do insert', async () => {
    const semLinha = builder({ data: [], error: null });
    const conflito = builder({ data: null, error: null }, { error: { code: '23505' } });
    const existente = builder({ data: [{ id: 'budget-1' }], error: null });
    from
      .mockReturnValueOnce(semLinha.chain)
      .mockReturnValueOnce(conflito.chain)
      .mockReturnValueOnce(existente.chain);

    await saveCeiling({ cooperativaId: 'coop-1', ano: 2026, mes: 12, verbaTotal: 5_000 });

    expect(semLinha.update).toHaveBeenCalledTimes(1);
    expect(conflito.insert).toHaveBeenCalledTimes(1);
    expect(existente.update).toHaveBeenCalledTimes(1);
  });

  it('propaga o erro de permissão do insert em vez de mascará-lo', async () => {
    const negado = builder({ data: [], error: null }, { error: { code: '42501', message: 'permission denied' } });
    from.mockReturnValue(negado.chain);

    await expect(
      saveCeiling({ cooperativaId: 'outra-coop', ano: 2026, mes: 12, verbaTotal: 5_000 }),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('propaga o erro do update', async () => {
    const falha = builder({ data: null, error: { message: 'falhou' } });
    from.mockReturnValue(falha.chain);

    await expect(
      saveCeiling({ cooperativaId: 'coop-1', ano: 2026, mes: 12, verbaTotal: 5_000 }),
    ).rejects.toMatchObject({ message: 'falhou' });
  });
});

describe('loadDistributedTotal', () => {
  it('soma no banco, para incluir PAs inativos que a policy esconde', async () => {
    rpc.mockResolvedValue({ data: '1234.50', error: null });

    await expect(loadDistributedTotal('coop-1', 2026, 12)).resolves.toBe(1234.5);
    expect(rpc).toHaveBeenCalledWith('cooperativa_verba_distribuida', {
      p_cooperativa_id: 'coop-1',
      p_ano: 2026,
      p_mes: 12,
    });
  });

  it('propaga o erro da RPC', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'sem permissao' } });

    await expect(loadDistributedTotal('outra-coop', 2026, 12)).rejects.toMatchObject({
      message: 'sem permissao',
    });
  });
});

describe('cooperativaCeilingQueryKey', () => {
  it('delimita a família de cache usada por quem aloca verba', () => {
    expect(cooperativaCeilingQueryKey()).toEqual(['cooperativa-ceiling']);
    expect(cooperativaCeilingQueryKey('coop-1')).toEqual(['cooperativa-ceiling', 'coop-1']);
  });
});
