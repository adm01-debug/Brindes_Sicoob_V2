import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs sem tipos
import { analyze } from '../../scripts/rules/rules/rls-estatico.mjs';

const run = (...sqls: string[]) =>
  analyze(sqls.map((sql, i) => ({ file: `m${i}.sql`, sql })))
    .tables as Map<string, { rls: boolean; policies: number; partition: boolean }>;

describe('rules/rls-estatico', () => {
  it('tabela criada sem RLS aparece como rls=false', () => {
    expect(run('create table public.a (id int);').get('a')?.rls).toBe(false);
  });

  it('ENABLE em migration posterior liga; DISABLE desliga (último vence)', () => {
    expect(run('create table a (id int);', 'ALTER TABLE public.a ENABLE ROW LEVEL SECURITY;').get('a')?.rls).toBe(true);
    expect(run('create table a (id int);', 'alter table a enable row level security;', 'alter table a disable row level security;').get('a')?.rls).toBe(false);
  });

  it('conta policies e ignora SQL comentado', () => {
    const t = run('create table a (id int); -- create table fantasma (x int);\ncreate policy "p" on public.a for select using (true);');
    expect(t.get('a')?.policies).toBe(1);
    expect(t.has('fantasma')).toBe(false);
  });

  it('DROP TABLE remove a tabela', () => {
    expect(run('create table a (id int);', 'drop table if exists a;').has('a')).toBe(false);
  });

  it('ignora outros schemas, palavras SQL e marca partições', () => {
    const t = run(
      'create table auth.x (id int); create table if not exists public.b (id int) partition by range (id);',
      'create table public.b_2026 partition of public.b for values from (1) to (2);',
      "do $$ begin execute 'create table if not exists %I'; end $$;",
    );
    expect(t.has('x')).toBe(false);
    expect(t.has('if')).toBe(false);
    expect(t.get('b_2026')?.partition).toBe(true);
    expect(t.get('b')?.partition).toBe(false);
  });
});

describe('rules/rls-estatico — ordem dos comandos', () => {
  it('DROP TABLE seguido de CREATE TABLE na mesma migration: a tabela existe (sem RLS)', () => {
    expect(run('drop table if exists a; create table a (id int);').get('a')?.rls).toBe(false);
  });

  it('CREATE seguido de DROP na mesma migration: a tabela some', () => {
    expect(run('create table a (id int); drop table a;').has('a')).toBe(false);
  });
});

describe('rules/rls-estatico — DROP POLICY', () => {
  const base = 'create table a (id int); alter table a enable row level security;';

  it('DROP POLICY da última policy zera a contagem', () => {
    const t = run(base, 'create policy "p" on public.a for select using (true);', 'drop policy if exists "p" on public.a;');
    expect(t.get('a')?.policies).toBe(0);
  });

  it('com 2 policies, remover 1 mantém 1; recriar a mesma não duplica', () => {
    const t = run(base, 'create policy p1 on a for select using (true); create policy p2 on a for insert with check (true);', 'drop policy p1 on a;');
    expect(t.get('a')?.policies).toBe(1);
    expect(run(base, 'create policy p1 on a using (true);', 'drop policy p1 on a; create policy p1 on a using (true);').get('a')?.policies).toBe(1);
  });
  it('schema public entre aspas vale em ALTER, DROP POLICY e DROP TABLE (igual a public.a)', () => {
    const base = 'create table public.a (id int); alter table public.a enable row level security; create policy p on public.a using (true);';
    expect(run(base, 'ALTER TABLE "public".a DISABLE ROW LEVEL SECURITY;').get('a')?.rls).toBe(false);
    expect(run(base, 'DROP POLICY p ON "public".a;').get('a')?.policies).toBe(0);
    expect(run(base, 'ALTER TABLE "public"."a" DISABLE ROW LEVEL SECURITY;').get('a')?.rls).toBe(false);
    expect(run(base, 'drop table "public" . "a";').has('a')).toBe(false);
  });
  it('policy criada com aspas e removida sem (ou o contrário) é a mesma; caixa só conta entre aspas', () => {
    const base = 'create table a (id int); alter table a enable row level security;';
    expect(run(base, 'create policy "p" on a using (true);', 'drop policy p on a;').get('a')?.policies).toBe(0);
    expect(run(base, 'create policy p on a using (true);', 'drop policy "p" on a;').get('a')?.policies).toBe(0);
    expect(run(base, 'create policy P on a using (true);', 'drop policy "p" on a;').get('a')?.policies).toBe(0);
    expect(run(base, 'create policy "P" on a using (true);', 'drop policy p on a;').get('a')?.policies).toBe(1);
  });
  it('ALTER PUBLICATION ... DROP TABLE não apaga a tabela; DROP TABLE de verdade apaga', () => {
    const base = 'create table public.a (id int); alter table public.a enable row level security;';
    expect(run(base, 'ALTER PUBLICATION supabase_realtime DROP TABLE public.a;').has('a')).toBe(true);
    expect(run(base, 'alter publication p\n  drop table a;').has('a')).toBe(true);
    // policies posteriores continuam sendo contabilizadas
    expect(run(base, 'ALTER PUBLICATION supabase_realtime DROP TABLE public.a;', 'create policy p on a using (true);').get('a')?.policies).toBe(1);
    expect(run(base, 'drop table public.a;').has('a')).toBe(false);
    expect(run(base, 'alter publication p drop table a; drop table a;').has('a')).toBe(false);
  });
  it('DDL escrito dentro de corpo de função não é executado pela migration', () => {
    const base = 'create table public.a (id int); alter table public.a enable row level security;';
    const g = "create function public.g() returns text language sql as $$ select 'drop table public.a; alter table public.a disable row level security' $$;";
    const t = run(base, g);
    expect(t.has('a')).toBe(true);
    expect(t.get('a')?.rls).toBe(true);
    // DO $$ executa na hora
    expect(run(base, 'DO $$ BEGIN DROP TABLE public.a; END $$;').has('a')).toBe(false);
  });
});

describe('rules/rls-estatico — SQL dinâmico e nomes', () => {
  const partitions = (names: string[]) =>
    [
      'create table public.log (id int) partition by range (id);',
      ...names.map((n) => `create table public.${n} partition of public.log for values from (1) to (2);`),
    ].join('\n');

  it('laço por LIKE de prefixo que liga RLS e cria policy vale para as tabelas já existentes', () => {
    const dyn = `DO $$ DECLARE t text; BEGIN
      FOR t IN SELECT tablename FROM pg_tables WHERE tablename LIKE 'log%' AND schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('CREATE POLICY "Ver logs" ON public.%I FOR SELECT USING (true);', t);
      END LOOP; END $$;`;
    const t = run(partitions(['log_a', 'log_b']), dyn);
    for (const n of ['log_a', 'log_b']) {
      expect(t.get(n)?.rls, n).toBe(true);
      expect(t.get(n)?.policies, n).toBe(1);
    }
  });

  it('FOREACH sobre ARRAY literal liga só as tabelas listadas', () => {
    const dyn = `DO $$ DECLARE p text; BEGIN
      FOREACH p IN ARRAY ARRAY['log_a'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p);
      END LOOP; END $$;`;
    const t = run(partitions(['log_a', 'log_b']), dyn);
    expect(t.get('log_a')?.rls).toBe(true);
    expect(t.get('log_b')?.rls).toBe(false);
  });

  it('partição criada DEPOIS do laço de prefixo continua sem RLS (o laço não é retroativo ao futuro)', () => {
    const dyn = `DO $$ BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE tablename LIKE 'log%' LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t); END LOOP; END $$;`;
    const t = run(partitions(['log_a']), dyn, 'create table public.log_c partition of public.log for values from (3) to (4);');
    expect(t.get('log_a')?.rls).toBe(true);
    expect(t.get('log_c')?.rls).toBe(false);
  });

  it('caixa: CREATE TABLE Mixed + ALTER minúsculo é a mesma tabela', () => {
    expect(run('create table public.Pedidos_X (id int);', 'alter table public.pedidos_x enable row level security;').get('pedidos_x')?.rls).toBe(true);
  });

  it('DROP TABLE a, b remove as duas', () => {
    const t = run('create table a (id int); create table b (id int); create table c (id int);', 'drop table if exists a, b cascade;');
    expect([...t.keys()]).toEqual(['c']);
  });

  it('CREATE UNLOGGED TABLE é reconhecida', () => {
    expect(run('create unlogged table public.cache_x (id int);').has('cache_x')).toBe(true);
  });
});
