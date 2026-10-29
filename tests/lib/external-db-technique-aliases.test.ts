import { describe, expect, it } from 'vitest';
import {
  mapTechniqueFiltersToExternal,
  mapTechniqueOrderByToExternal,
  mapTechniqueRowToLegacyShape,
  resolveTableAlias,
} from '../../supabase/functions/_shared/external-db-aliases.ts';

describe('aliases das técnicas do catálogo externo', () => {
  it('não consulta nem ordena por SLA ausente na origem', () => {
    const alias = resolveTableAlias(
      'personalization_technique_options',
      { estimated_days: 5 },
      { column: 'estimated_days', ascending: true },
    );

    expect(alias.table).toBe('tabela_preco_gravacao_oficial');
    expect(alias.select).toBe('id,nome,codigo,ativo');
    expect(alias.filters).toEqual({});
    expect(alias.orderBy).toEqual({ column: 'nome', ascending: true });
    expect(alias.select).not.toContain('tempo_producao_dias');
    expect(alias.select).not.toContain('estimated_days');
  });

  it('descarta filtros de SLA que a origem não consegue aplicar', () => {
    expect(mapTechniqueFiltersToExternal({ tempo_producao_dias: 7, estimated_days: 5 })).toEqual(
      {},
    );
    expect(mapTechniqueOrderByToExternal({ column: 'tempo_producao_dias' })).toEqual({
      column: 'nome',
    });
  });

  it('não inventa SLA quando a origem não o fornece', () => {
    const row = mapTechniqueRowToLegacyShape({
      id: 'technique-1',
      codigo: 'LASER',
      nome: 'Laser',
      ativo: true,
    });

    expect(row.estimated_days).toBeNull();
    expect(row.tempo_producao_dias).toBeNull();
  });
});
