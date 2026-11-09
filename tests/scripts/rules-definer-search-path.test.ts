import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs sem tipos
import { definerSemSearchPath } from '../../scripts/rules/rules/plano-melhorias.mjs';

const run = (...sqls: string[]) => definerSemSearchPath(sqls.map((sql, i) => ({ file: `m${i}.sql`, sql }))) as string[];
const BULK = `DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT p.proname FROM pg_proc p LOOP
  EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 'public', r.proname, ''); END LOOP; END $$;`;

describe('rules/plano-definer-sem-search-path', () => {
  it('acusa DEFINER sem SET (atributos antes do corpo)', () => {
    const r = run('create function public.f() returns void security definer language sql as $$ select 1 $$;');
    expect(r).toHaveLength(1);
    expect(r[0]).toContain('f()');
  });

  it('aceita SET search_path antes ou depois do corpo', () => {
    expect(run('create function f() returns int security definer set search_path = public as $$ select 1 $$ language sql;')).toEqual([]);
    expect(run('create function g() returns int as $$ select 1 $$ language sql security definer set search_path = public;')).toEqual([]);
  });

  it('ignora função INVOKER', () => {
    expect(run('create function h() returns int as $$ select 1 $$ language sql;')).toEqual([]);
  });

  it('ALTER FUNCTION ... SET search_path corrige', () => {
    expect(run('create function f() returns int security definer as $$ select 1 $$ language sql;', 'alter function public.f() set search_path = public;')).toEqual([]);
  });

  it('endurecimento em lote cobre o que existia, mas não a redefinição posterior', () => {
    const def = (n: string) => `create or replace function ${n}() returns int security definer as $$ select 1 $$ language sql;`;
    expect(run(def('a'), BULK)).toEqual([]);
    const after = run(def('a'), BULK, def('a'));
    expect(after).toHaveLength(1);
  });

  it('DROP FUNCTION remove; $$ com ponto e vírgula no corpo não quebra', () => {
    expect(run('create function f() returns int security definer as $$ begin perform 1; return 1; end; $$ language plpgsql;', 'drop function if exists f();')).toEqual([]);
    expect(run('create function f() returns int as $$ begin perform 1; return 1; end; $$ language plpgsql security definer;')).toHaveLength(1);
  });
});
