import { describe, expect, it } from 'vitest';
import { analyzeMigrationSql, stripSqlComments } from '../../scripts/db/classify-migration-backlog.mjs';

describe('classificador do backlog de migrations', () => {
  it('ignora operações perigosas mencionadas apenas em comentários', () => {
    const sql = `-- DROP TABLE public.quotes;\n/* TRUNCATE profiles; */\nCREATE TABLE public.safe_table (id uuid);`;
    expect(stripSqlComments(sql)).not.toContain('DROP TABLE');
    expect(analyzeMigrationSql(sql).flags).toEqual([]);
  });

  it('bloqueia DDL destrutivo e DML de remoção', () => {
    const result = analyzeMigrationSql('DELETE FROM public.quotes; DROP TABLE public.quotes;');
    expect(result.disposition).toBe('bloquear_aplicacao_automatica');
    expect(result.flags).toEqual(expect.arrayContaining(['delete_dados', 'drop_objeto']));
  });

  it('prioriza revisão de policy aberta e SECURITY DEFINER sem search_path', () => {
    const sql = `
      CREATE FUNCTION public.open_rpc() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ SELECT 1 $$;
      CREATE POLICY open_access ON public.quotes USING (true);
    `;
    const result = analyzeMigrationSql(sql, { relations: ['quotes'], functions: [] });
    expect(result.disposition).toBe('revisao_manual_prioritaria');
    expect(result.flags).toEqual(expect.arrayContaining(['policy_using_true', 'security_definer_sem_search_path_explicito']));
  });

  it('sinaliza dependência ausente antes do dry-run', () => {
    const result = analyzeMigrationSql('ALTER TABLE public.unknown_table ADD COLUMN note text;', { relations: [], functions: [] });
    expect(result.disposition).toBe('bloqueada_por_dependencia_ausente');
    expect(result.objects.missing_touched_relations).toEqual(['unknown_table']);
  });

  it('separa objeto possivelmente aplicado fora do ledger', () => {
    const result = analyzeMigrationSql('CREATE TABLE IF NOT EXISTS public.quotes (id uuid);', { relations: ['quotes'], functions: [] });
    expect(result.disposition).toBe('possivelmente_aplicada_fora_ledger');
    expect(result.objects.existing).toEqual([{ type: 'relation', name: 'quotes' }]);
  });

  it('exige revisão manual antes de migrations que alteram dados', () => {
    const result = analyzeMigrationSql('UPDATE public.quotes SET status = \'draft\';', { relations: ['quotes'], functions: [] });
    expect(result.disposition).toBe('revisao_manual_prioritaria');
    expect(result.flags).toContain('update_dados');
  });
});
