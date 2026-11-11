import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { findSecretExposure, inspectAuthorization } from '../../scripts/lib/edge-authorization-contract.mjs';
import { UsageError, parseArgs } from '../../scripts/lib/cli.mjs';

const ROOT = resolve(__dirname, '../..');
const run = (script: string, cwd: string, env: Record<string, string> = {}) =>
  spawnSync(process.execPath, [script], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });

describe('contrato de autorização das edges: o resultado do authorize precisa ser usado', () => {
  const imp = "import { authorize } from '../_shared/authorize.ts';\n";

  it('conta `const auth = await authorize(..., { requireRole })`', () => {
    const source = `${imp}export default async (req) => { const auth = await authorize(req, { requireRole: 'dev' }); if (!auth.ok) return auth.response; };`;
    expect(inspectAuthorization(source).sharedRoles).toEqual(['dev']);
  });

  it('conta desestruturação e uso direto em condição', () => {
    const a = `${imp}const { ok } = await authorize(req, { requireRole: 'supervisor' });`;
    const b = `${imp}if (!(await authorize(req, { requireRole: 'dev' })).ok) return new Response(null, { status: 403 });`;
    expect(inspectAuthorization(a).sharedRoles).toEqual(['supervisor']);
    expect(inspectAuthorization(b).sharedRoles).toEqual(['dev']);
  });

  it('NÃO conta `await authorize(...)` com o resultado descartado (a função ficaria aberta)', () => {
    const source = `${imp}export default async (req) => { await authorize(req, { requireRole: 'dev' }); return new Response('dados'); };`;
    expect(inspectAuthorization(source).sharedRoles).toEqual([]);
  });
});

describe('parseArgs: flag herdada do protótipo não é flag', () => {
  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])('rejeita --%s', (flag) => {
    expect(() => parseArgs([`--${flag}=x`], { json: { type: 'boolean' } })).toThrow(UsageError);
  });

  it('continua aceitando as flags declaradas e aliases', () => {
    const { values } = parseArgs(['--json', '-r', 'src'], {
      json: { type: 'boolean', default: false },
      root: { type: 'string', alias: 'r' },
    });
    expect(values).toEqual({ json: true, root: 'src' });
  });
});

describe('check-sicoob-hardcoded-colors: cobertura de diretórios', () => {
  it('funciona de qualquer cwd (a raiz vem do próprio arquivo)', () => {
    const result = run(join(ROOT, 'scripts/check-sicoob-hardcoded-colors.mjs'), join(ROOT, 'src'));
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('Nenhuma cor hardcoded');
  });

  it('diretório alvo ausente falha (exit 2) em vez de passar sem varrer', () => {
    const root = mkdtempSync(join(tmpdir(), 'colors-'));
    mkdirSync(join(root, 'scripts'));
    copyFileSync(join(ROOT, 'scripts/check-sicoob-hardcoded-colors.mjs'), join(root, 'scripts/check-sicoob-hardcoded-colors.mjs'));
    mkdirSync(join(root, 'src/pages/sicoob'), { recursive: true });
    const result = run(join(root, 'scripts/check-sicoob-hardcoded-colors.mjs'), root);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('src/components/sicoob');
  });

  it('acusa cor hardcoded em src/pages/admin/sicoob', () => {
    const root = mkdtempSync(join(tmpdir(), 'colors-'));
    mkdirSync(join(root, 'scripts'));
    copyFileSync(join(ROOT, 'scripts/check-sicoob-hardcoded-colors.mjs'), join(root, 'scripts/check-sicoob-hardcoded-colors.mjs'));
    for (const dir of ['src/pages/sicoob', 'src/components/sicoob', 'src/pages/admin/sicoob']) mkdirSync(join(root, dir), { recursive: true });
    writeFileSync(join(root, 'src/pages/admin/sicoob/X.tsx'), 'export const X = () => <b className="text-red-500">x</b>;\n');
    const result = run(join(root, 'scripts/check-sicoob-hardcoded-colors.mjs'), root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('X.tsx');
  });
});

describe('check-agents-md-integrity: cabeçalhos e ponteiro do CLAUDE.md', () => {
  const SECTIONS = [
    'Postura', 'Bugs e funcionalidades', 'Comunicação', 'Fluxo Git', 'Banco', 'Serviços', 'Stack e comandos', 'Grafo de código',
  ];
  const body = 'regra normativa com conteúdo real suficiente para passar do limite mínimo. '.repeat(6);
  const agents = (heading = '##') => SECTIONS.map((s) => `${heading} ${s}\n${body}\n`).join('\n');

  function repo(files: { agents?: string; claude?: string }) {
    const dir = mkdtempSync(join(tmpdir(), 'agents-md-'));
    if (files.agents !== undefined) writeFileSync(join(dir, 'AGENTS.md'), files.agents);
    if (files.claude !== undefined) writeFileSync(join(dir, 'CLAUDE.md'), files.claude);
    return dir;
  }
  const check = (dir: string) => run(join(ROOT, 'scripts/ci/check-agents-md-integrity.mjs'), dir, { AGENTS_MD_BASE: 'refs/nao-existe' });

  it('arquivo íntegro passa', () => {
    const result = check(repo({ agents: agents(), claude: '@AGENTS.md\n' }));
    expect(result.status, result.stderr).toBe(0);
  });

  it('seção rebaixada para ### não conta como presente', () => {
    const rebaixada = agents().replace('## Banco', '### Banco');
    const result = check(repo({ agents: rebaixada, claude: '@AGENTS.md\n' }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('## Banco: secao ausente');
  });

  it('seção removida mas citada no meio de outra não conta como presente', () => {
    const semBanco = agents().replace(new RegExp(`## Banco\\n${body}\\n`), '');
    const citada = semBanco.replace('## Postura\n', '## Postura\nVeja `## Banco` em outro lugar.\n');
    const result = check(repo({ agents: citada, claude: '@AGENTS.md\n' }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('## Banco: secao ausente');
  });

  it.each([
    ['vazio', ''],
    ['sem o ponteiro', '# Regras\nsem referência\n'],
  ])('CLAUDE.md %s reprova', (_label, claude) => {
    const result = check(repo({ agents: agents(), claude }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('@AGENTS.md');
  });

  it('CLAUDE.md ausente reprova', () => {
    expect(check(repo({ agents: agents() })).status).toBe(1);
  });
});


describe('anti-exfiltração de credenciais de serviço nas edges', () => {
  const ENVS = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL'];
  const exposed = (source: string) => findSecretExposure(source, ENVS).map((f: { env: string }) => f.env);

  it.each([
    ['JSON.stringify direto', 'new Response(JSON.stringify({ k: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") }));'],
    ['variável intermediária', 'const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");\nreturn new Response(JSON.stringify({ k }));'],
    ['propriedade com outro nome', 'return Response.json({ key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") });'],
    ['corpo é o próprio segredo', 'return new Response(Deno.env.get("SUPABASE_DB_URL"));'],
    ['nome da env em template literal', 'return Response.json({ service_role: Deno.env.get(`SUPABASE_SERVICE_ROLE_KEY`) });'],
    ['nome da env em constante', 'const NAME = "SUPABASE_DB_URL";\nreturn new Response(Deno.env.get(NAME));'],
    ['com ?? e !', 'const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";\nreturn new Response(JSON.stringify({ info: k }));'],
    ['propagada por outra variável', 'const a = Deno.env.get("SUPABASE_DB_URL")!;\nconst b = a;\nreturn new Response(b);'],
    ['helper de resposta', 'const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");\nreturn jsonResponse({ k }, 200);'],
  ])('acusa %s', (_label, source) => {
    expect(exposed(source).length).toBeGreaterThan(0);
  });

  it.each([
    ['createClient', 'const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);'],
    ['header de chamada de saída', 'await fetch(url, { headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` } });'],
    ['segredo guardado e usado só no client', 'const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;\nconst c = createClient(url, key);\nreturn new Response(JSON.stringify({ ok: true }));'],
    ['env não sensível na resposta', 'return Response.json({ url: Deno.env.get("SUPABASE_URL") });'],
    ['comparação sem expor o valor', 'const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");\nif (token !== k) return new Response("forbidden", { status: 403 });'],
  ])('não acusa %s', (_label, source) => {
    expect(exposed(source)).toEqual([]);
  });

  it('informa a linha da exposição', () => {
    const source = 'const a = 1;\nconst k = Deno.env.get("SUPABASE_DB_URL");\nreturn new Response(k);\n';
    expect(findSecretExposure(source, ENVS)).toEqual([{ env: 'SUPABASE_DB_URL', line: 3 }]);
  });
});
