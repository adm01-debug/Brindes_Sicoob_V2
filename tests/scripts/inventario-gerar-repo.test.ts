import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = resolve(__dirname, '../../scripts/inventario/gerar-repo.mjs');

/** Repo mínimo (em pasta COM ESPAÇO no nome) com 3 edges: usada pelo front, só citada no manifesto e só citada em teste. */
function repo() {
  const root = join(mkdtempSync(join(tmpdir(), 'gerar repo ')), 'projeto com espaço');
  const w = (rel: string, text: string) => {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  mkdirSync(join(root, 'scripts/inventario'), { recursive: true });
  copyFileSync(SCRIPT, join(root, 'scripts/inventario/gerar-repo.mjs'));
  w('supabase/functions/usada/index.ts', 'Deno.serve(() => new Response(Deno.env.get("A_KEY") ?? ""));');
  w('supabase/functions/so-manifesto/index.ts', 'Deno.serve(() => new Response("x"));');
  w('supabase/functions/so-teste/index.ts', 'Deno.serve(() => new Response("y"));');
  w(
    'supabase/functions/_shared/edge-authz-manifest.ts',
    'export const M = { "usada": {}, "so-manifesto": {}, "so-teste": {} };',
  );
  w('supabase/functions/tests/contrato.test.ts', 'expect(call("so-teste")).toBeTruthy();');
  w('src/uso.ts', 'await supabase.functions.invoke("usada");');
  // Pastas que o inventário varre (o ripgrep sai com erro para caminho inexistente).
  w('supabase/migrations/20260101000000_x.sql', 'select 1;');
  w('supabase/config.toml', '');
  w('e2e/smoke.spec.ts', '');
  w('.github/workflows/ci.yml', 'name: ci');
  return root;
}
const run = (root: string) =>
  spawnSync(process.execPath, [join(root, 'scripts/inventario/gerar-repo.mjs')], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
const edges = (root: string) => JSON.parse(readFileSync(join(root, 'inventario/estado/edges.json'), 'utf8'));

describe('inventario/gerar-repo — chamadores das edges', () => {
  it('funciona num checkout com espaço no caminho (antes: ENOENT por %20)', () => {
    const root = repo();
    const result = run(root);
    expect(result.status, result.stderr).toBe(0);
    expect(edges(root).total).toBe(3);
  });

  it('o manifesto de autorização e os testes não contam como chamador', () => {
    const root = repo();
    run(root);
    const data = edges(root);
    expect(data.sem_chamador_no_repo).toEqual(['so-manifesto', 'so-teste']);
    expect(data.edge_functions.usada.sem_chamador).toBe(false);
    expect(data.edge_functions['so-manifesto'].chamada_em.outras_edges).toBe(0);
  });

  it('sem stdin redirecionado e sem TTY não falha com EAGAIN depois de gravar o inventário', () => {
    const root = repo();
    // stdio 'pipe' sem fechar o stdin: o fd 0 é um pipe aberto e sem dados.
    const result = spawnSync(process.execPath, [join(root, 'scripts/inventario/gerar-repo.mjs')], {
      cwd: root,
      encoding: 'utf8',
      input: '',
    });
    expect(result.status, result.stderr).toBe(0);
  });
});
