import { describe, expect, it } from 'vitest';
import {
  competenciaDoLancamento,
  lancamentosSemPedido,
  normalizarReconciliacao,
  origemDoLancamento,
  totalDoLivro,
  type LancamentoDeVerba,
} from '@/components/sicoob/BudgetEntriesDialog';

const lancamento = (over: Partial<LancamentoDeVerba> = {}): LancamentoDeVerba => ({
  id: over.id ?? 'l1',
  competencia_ano: over.competencia_ano ?? 2026,
  competencia_mes: over.competencia_mes ?? 9,
  tipo: over.tipo ?? 'ajuste',
  estado: over.estado ?? 'consumido',
  valor: over.valor ?? 3200,
  motivo: over.motivo ?? null,
  order_id: over.order_id ?? null,
  created_at: over.created_at ?? '2026-09-10T00:00:00Z',
});

describe('totalDoLivro', () => {
  it('soma so o estado pedido', () => {
    const livro = [
      lancamento({ id: 'a', valor: 3200 }),
      lancamento({ id: 'b', valor: 4800 }),
      lancamento({ id: 'c', valor: 1000, estado: 'reservado' }),
    ];
    expect(totalDoLivro(livro, 'consumido')).toBe(8000);
    expect(totalDoLivro(livro, 'reservado')).toBe(1000);
    expect(totalDoLivro(livro, 'comprometido')).toBe(0);
  });

  it('livro vazio soma zero em vez de quebrar', () => {
    expect(totalDoLivro([], 'consumido')).toBe(0);
  });
});

describe('lancamentosSemPedido', () => {
  it('separa o consumo que nenhum pedido explica', () => {
    const livro = [
      lancamento({ id: 'a', order_id: 'pedido-1' }),
      lancamento({ id: 'b', order_id: null }),
      lancamento({ id: 'c', order_id: null }),
    ];
    expect(lancamentosSemPedido(livro).map((l) => l.id)).toEqual(['b', 'c']);
  });
});

describe('origemDoLancamento', () => {
  it('distingue lancamento de pedido de ajuste sem pedido', () => {
    expect(origemDoLancamento(lancamento({ order_id: 'pedido-1' }))).toBe('Pedido');
    expect(origemDoLancamento(lancamento({ order_id: null }))).toBe('Sem pedido atribuível');
  });
});

describe('competenciaDoLancamento', () => {
  it('preenche o mes com zero a esquerda', () => {
    expect(competenciaDoLancamento(lancamento({ competencia_mes: 9 }))).toBe('09/2026');
    expect(competenciaDoLancamento(lancamento({ competencia_mes: 11 }))).toBe('11/2026');
  });
});

describe('normalizarReconciliacao', () => {
  it('le a primeira linha devolvida pela RPC', () => {
    const r = normalizarReconciliacao({
      pa_budget_id: 'b1',
      planejado: 50000,
      reservado_agregado: 0,
      reservado_livro: 0,
      comprometido_agregado: 0,
      comprometido_livro: 0,
      consumido_agregado: 8000,
      consumido_livro: 8000,
      divergente: false,
    });
    expect(r?.consumido_agregado).toBe(8000);
    expect(r?.divergente).toBe(false);
  });

  it('marca divergencia quando agregado e livro diferem', () => {
    const r = normalizarReconciliacao({ consumido_agregado: 30200, consumido_livro: 26300, divergente: true });
    expect(r?.divergente).toBe(true);
    expect(r?.consumido_agregado).toBe(30200);
  });

  it('trata nulos e ausentes como zero em vez de NaN', () => {
    const r = normalizarReconciliacao({ consumido_agregado: null, comprometido_livro: undefined });
    expect(r?.consumido_agregado).toBe(0);
    expect(r?.comprometido_livro).toBe(0);
    expect(r?.divergente).toBe(false);
  });

  it('devolve null quando a RPC nao retornou linha', () => {
    expect(normalizarReconciliacao(undefined)).toBeNull();
    expect(normalizarReconciliacao(null)).toBeNull();
  });

  it('nao aceita divergente verdadeiro vindo como texto', () => {
    expect(normalizarReconciliacao({ divergente: 'true' })?.divergente).toBe(false);
  });
});