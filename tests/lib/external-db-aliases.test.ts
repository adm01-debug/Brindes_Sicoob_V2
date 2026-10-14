import { describe, expect, it } from 'vitest';
import { resolveTableAlias } from '../../supabase/functions/_shared/external-db-aliases';

describe('alias seguro das técnicas do catálogo', () => {
  it('força uma projeção sem preços e preserva o identificador usado nas áreas', () => {
    const alias = resolveTableAlias(
      'personalization_technique_options',
      { is_active: true },
      { column: 'name', ascending: true },
      '*',
    );

    expect(alias.table).toBe('tabela_preco_gravacao_oficial');
    expect(alias.aliasType).toBe('techniqueOptions');
    expect(alias.filters).toEqual({ ativo: true });
    expect(alias.select.split(',')).toEqual([
      'id', 'nome', 'codigo', 'tempo_producao_dias', 'ativo',
    ]);
    expect(alias.select).not.toMatch(/preco|custo|faturamento/i);
  });
});
