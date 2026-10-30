import { describe, expect, it } from 'vitest';
import { salesGoalSchema } from '@/lib/validations/goalSchema';

const validGoal = {
  title: 'Meta mensal',
  target_value: 12500,
  goal_type: 'revenue',
  period: 'monthly',
  start_date: '2026-10-01',
  end_date: '2026-10-31',
  notes: '',
};

describe('schema de metas comerciais com Zod 4', () => {
  it('aceita uma meta coerente e mantém a validação de datas', () => {
    expect(salesGoalSchema.safeParse(validGoal).success).toBe(true);
    expect(salesGoalSchema.safeParse({
      ...validGoal,
      start_date: '2026-10-31',
      end_date: '2026-10-01',
    }).success).toBe(false);
  });

  it('preserva mensagens em português para campos enum obrigatórios e inválidos', () => {
    expect(salesGoalSchema.safeParse({ ...validGoal, goal_type: undefined }).error?.issues[0]?.message)
      .toBe('Tipo de meta é obrigatório');
    expect(salesGoalSchema.safeParse({ ...validGoal, period: undefined }).error?.issues[0]?.message)
      .toBe('Período é obrigatório');
    expect(salesGoalSchema.safeParse({ ...validGoal, goal_type: 'desconhecida' }).error?.issues[0]?.message)
      .toBe('Tipo de meta inválido');
  });
});
