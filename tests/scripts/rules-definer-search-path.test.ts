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

  it('reconhece o schema public entre aspas (CREATE, ALTER e DROP)', () => {
    const def = 'create function "public"."f"() returns void security definer language sql as $$ select 1 $$;';
    expect(run(def)).toHaveLength(1);
    expect(run(def, 'alter function "public"."f"() set search_path = public;')).toEqual([]);
    expect(run(def, 'drop function if exists "public" . "f"();')).toEqual([]);
  });

  it('reconhece SET "search_path" entre aspas (CREATE e ALTER)', () => {
    expect(run('create function f() returns int security definer set "search_path" to public as $$ select 1 $$ language sql;')).toEqual([]);
    const def = 'create function g() returns void security definer language sql as $$ select 1 $$;';
    expect(run(def)).toHaveLength(1);
    expect(run(def, 'alter function g() set "search_path" = public;')).toEqual([]);
  });

  it('corpo entre aspas simples com \'\' escapado não vira atributo da função', () => {
    // o texto "SET search_path" está DENTRO do corpo: a função continua sem proteção
    expect(run("create function public.f() returns text as 'select ''set search_path''::text' language sql security definer;")).toHaveLength(1);
    // o inverso: "SECURITY DEFINER" só dentro do corpo de uma função INVOKER não gera alerta
    expect(run("create function public.g() returns text as 'select ''security definer''::text' language sql;")).toEqual([]);
    // atributo real depois do corpo continua valendo
    expect(run("create function public.h() returns text as 'select ''x''::text' language sql security definer set search_path = public;")).toEqual([]);
  });

  it('ALTER/DROP escritos dentro do corpo de outra função não são comandos executados', () => {
    const f = 'create function public.f() returns void security definer language sql as $$ select 1 $$;';
    expect(run(f)).toHaveLength(1);
    // g só RETORNA o texto "alter function ... set search_path": f continua vulnerável
    expect(run(f, "create function public.g() returns text language sql as $$ select 'ALTER FUNCTION public.f() SET search_path = public' $$;")).toHaveLength(1);
    expect(run(f, 'create function public.g() returns text language sql as $b$ select $x$DROP FUNCTION public.f()$x$ $b$;')).toHaveLength(1);
    // fora de corpo continua valendo
    expect(run(f, 'ALTER FUNCTION public.f() SET search_path = public;')).toEqual([]);
    // DO $$ executa na hora: o ALTER dentro dele conta
    expect(run(f, 'DO $$ BEGIN ALTER FUNCTION public.f() SET search_path = public; END $$;')).toEqual([]);
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

describe('rules/plano-definer-sem-search-path — ordem dos comandos', () => {
  it('DROP seguido de CREATE na mesma migration: a função existe e continua acusada', () => {
    const sql = 'drop function if exists f(); create function f() returns int security definer as $$ select 1 $$ language sql;';
    expect(run(sql)).toHaveLength(1);
  });

  it('CREATE seguido de DROP na mesma migration: a função some', () => {
    const sql = 'create function f() returns int security definer as $$ select 1 $$ language sql; drop function f();';
    expect(run(sql)).toEqual([]);
  });
});
