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
});
