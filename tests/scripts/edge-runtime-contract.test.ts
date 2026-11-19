/**
 * Cobertura unitária Vitest do contrato de runtime das edge functions
 * (CONTRIBUTING.md: "lógica de infraestrutura crítica … deve ter cobertura de
 * testes unitários com Vitest").
 *
 * `runtime: "source-only"` no manifesto declara que a função fica preservada
 * como fonte e NÃO é publicada. O cenário equivalente em `tests/scenarios/`
 * roda no runner de cenários, que fica fora do Vitest — aqui a mesma regra é
 * exercida pelo gate de verdade (`scripts/check-edge-authorization.mjs`), com
 * árvore sintética, e não só pelas asserções sobre o manifesto real.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = resolve(__dirname, '../..');
const MANIFESTO = 'supabase/functions/_shared/edge-authz-manifest.ts';
const ALLOWLIST = 'scripts/ci/verify-supabase-functions-published.mjs';

function entradasDoManifesto(fonte: string): Map<string, string> {
  const entradas = new Map<string, string>();
  const re = /^\s+"([a-z0-9-]+)":\s*\{([^}]+)\}/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fonte)) !== null) {
    const [, nome = '', corpo = ''] = m;
    entradas.set(nome, /runtime:\s*"(deployed|source-only)"/.exec(corpo)?.[1] ?? 'deployed');
  }
  return entradas;
}

async function allowlistPublicacao(): Promise<string[]> {
  const mod = await import(resolve(RAIZ, ALLOWLIST));
  return (mod as { requiredFunctions: string[] }).requiredFunctions;
}

describe('contrato de runtime — manifesto real', () => {
  const fonte = readFileSync(resolve(RAIZ, MANIFESTO), 'utf8');

  it('o campo runtime só aceita os dois valores do contrato', () => {
    const valores = [...fonte.matchAll(/runtime:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(valores.filter((v) => v !== 'deployed' && v !== 'source-only')).toEqual([]);
  });

  it('nenhuma função "source-only" está na allowlist de publicação', async () => {
    const entradas = entradasDoManifesto(fonte);
    const allowlist = await allowlistPublicacao();
    expect(allowlist.filter((nome) => entradas.get(nome) === 'source-only')).toEqual([]);
  });

  it('toda função da allowlist de publicação existe no manifesto', async () => {
    const entradas = entradasDoManifesto(fonte);
    const allowlist = await allowlistPublicacao();
    expect(allowlist.filter((nome) => !entradas.has(nome))).toEqual([]);
  });

  it('as funções preservadas como fonte continuam declaradas e contadas', () => {
    const somenteFonte = [...entradasDoManifesto(fonte)]
      .filter(([, runtime]) => runtime === 'source-only')
      .map(([nome]) => nome)
      .sort();
    // Travar a lista: tirar uma daqui é publicar a função, e isso tem de ser
    // decisão escrita, não efeito colateral de edição no manifesto.
    expect(somenteFonte).toEqual(['e2e-auth-test', 'error-monitor', 'qa-block-monitor', 'sicoob-seed-debug']);
  });
});

describe('contrato de runtime — o gate reprova a contradição', () => {
  /** Cópia da árvore onde o manifesto pode ser estragado sem tocar no repo. */
  function arvore(mudarManifesto: (fonte: string) => string) {
    const dir = mkdtempSync(join(tmpdir(), 'edge-runtime-'));
    for (const caminho of ['scripts', 'supabase/functions/_shared']) {
      mkdirSync(join(dir, caminho), { recursive: true });
    }
    cpSync(join(RAIZ, 'scripts'), join(dir, 'scripts'), { recursive: true });
    cpSync(join(RAIZ, 'supabase/functions'), join(dir, 'supabase/functions'), { recursive: true });
    cpSync(join(RAIZ, 'supabase/config.toml'), join(dir, 'supabase/config.toml'));
    // O gate importa `typescript`; sem isto o Node procuraria node_modules a
    // partir de /tmp e o processo morreria antes de validar coisa alguma.
    symlinkSync(join(RAIZ, 'node_modules'), join(dir, 'node_modules'), 'dir');
    const fonte = readFileSync(join(RAIZ, MANIFESTO), 'utf8');
    writeFileSync(join(dir, MANIFESTO), mudarManifesto(fonte));
    return dir;
  }
  const rodar = (cwd: string) =>
    spawnSync(process.execPath, ['scripts/check-edge-authorization.mjs'], { cwd, encoding: 'utf8' });

  it('árvore intacta passa', () => {
    const r = rodar(arvore((f) => f));
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });

  it('marcar como "source-only" uma função da allowlist reprova', async () => {
    const [publicada] = await allowlistPublicacao();
    // A entrada pode nem declarar `runtime` (o padrão é "deployed"): o
    // sabotador injeta o campo logo depois da abertura da chave.
    const dir = arvore((f) =>
      f.replace(`"${publicada}": {`, `"${publicada}": {\n    runtime: "source-only",`),
    );
    const r = rodar(dir);
    expect(r.status, r.stdout).toBe(1);
    expect(r.stdout + r.stderr).toContain(publicada);
  });
});
