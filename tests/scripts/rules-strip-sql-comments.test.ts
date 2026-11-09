import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs sem tipos
import { stripSqlComments } from '../../scripts/rules/lib.mjs';
// @ts-expect-error módulo .mjs sem tipos
import { definerSemSearchPath } from '../../scripts/rules/rules/plano-melhorias.mjs';

const strip = (s: string) => stripSqlComments(s) as string;

describe('rules/lib — stripSqlComments respeita literais', () => {
  it('remove comentário de linha e de bloco (inclusive aninhado)', () => {
    expect(strip('select 1; -- fim\nselect 2;')).toBe('select 1; \nselect 2;');
    expect(strip('a /* x /* y */ z */ b')).toBe('a   b');
  });

  it("NÃO trata '--' nem '/*' dentro de string como comentário", () => {
    expect(strip("select '--' as a;")).toBe("select '--' as a;");
    expect(strip("select '/* nao e comentario */';")).toBe("select '/* nao e comentario */';");
  });

  it("entende '' escapado e E'...\\'...'", () => {
    expect(strip("select 'it''s -- ok';")).toBe("select 'it''s -- ok';");
    expect(strip("select E'a\\' -- ainda string';")).toBe("select E'a\\' -- ainda string';");
  });

  it('preserva identificador entre aspas e remove comentário dentro do corpo $$ (recursivo)', () => {
    expect(strip('select "a--b" from t;')).toBe('select "a--b" from t;');
    expect(strip("create function f() returns int as $$ select 1; -- nota\n$$ language sql;")).toBe(
      'create function f() returns int as $$ select 1; \n$$ language sql;',
    );
    expect(strip("as $b$ select '--'::text $b$")).toBe("as $b$ select '--'::text $b$");
  });

  it('$1 e identificadores com $ não abrem dollar-quote', () => {
    expect(strip('select $1, a$b -- c')).toBe('select $1, a$b ');
  });

  it('caso do revisor: literal "--" no corpo não esconde SECURITY DEFINER sem search_path', () => {
    const sql = "create function f() returns text as $$ select '--'::text $$ language sql security definer;";
    const r = definerSemSearchPath([{ file: 'm.sql', sql }]) as string[];
    expect(r).toHaveLength(1);
    expect(r[0]).toContain('f()');
  });
});
