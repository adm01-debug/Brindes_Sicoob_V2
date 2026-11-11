import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildExport } from '../../scripts/audit-export.mjs';
import { buildDossier } from '../../scripts/generate-audit-dossier.mjs';
import { buildReport, getStats } from '../../scripts/generate-enterprise-report.mjs';
import {
  AUDIT_INVENTORY,
  DECLARED,
  auditExportFileName,
  countEdgeFunctions,
  fetchRlsTables,
  indexRlsMigrations,
  repoWebUrl,
  summarizeRls,
  verifyEvidence,
} from '../../scripts/lib/audit-evidence.mjs';
import { extractLinks, resolveTargets } from '../../scripts/validate-audit-links.mjs';

const ROOT = resolve(__dirname, '../..');
const scratch = (prefix: string) => mkdtempSync(join(tmpdir(), prefix));

type Row = { relname: string; relrowsecurity: boolean };
const rpcClient = (result: { data?: unknown; error?: unknown }) => ({
  rpc: async () => ({ data: result.data ?? null, error: result.error ?? null }),
});

describe('inventário de evidências de auditoria', () => {
  it('todo item "implementado" aponta para arquivo real que contém o trecho citado', () => {
    for (const item of AUDIT_INVENTORY) {
      expect(verifyEvidence(item, ROOT), `${item.feature} → ${item.path}`).toMatchObject({ ok: true });
    }
  });

  it('reprova arquivo inexistente e trecho ausente, e não confere item a implementar', () => {
    const base = { module: 'X', feature: 'Y', status: 'implementado' };
    expect(verifyEvidence({ ...base, path: 'supabase/migrations/nao_existe.sql' }, ROOT)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('não existe'),
    });
    expect(verifyEvidence({ ...base, path: 'package.json', quote: 'trecho-que-nao-existe-9f3a' }, ROOT)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('ausente'),
    });
    expect(verifyEvidence({ ...base, status: 'a-implementar', path: 'roadmap/x' }, ROOT)).toEqual({
      ok: true,
      checked: false,
    });
  });
});

describe('leitura da RPC check_tables_rls', () => {
  it('erro da RPC vira exceção em vez de lista vazia', async () => {
    await expect(fetchRlsTables(rpcClient({ error: { message: 'função não encontrada' } }))).rejects.toThrow(
      /função não encontrada/,
    );
  });

  it.each([
    ['zero tabelas', []],
    ['resposta que não é lista', { relname: 'quotes' }],
    ['linha sem as colunas esperadas', [{ nome: 'x' }]],
    ['null', null],
  ])('rejeita %s', async (_label, data) => {
    await expect(fetchRlsTables(rpcClient({ data }))).rejects.toThrow();
  });

  it('devolve as tabelas ordenadas por nome', async () => {
    const rows = await fetchRlsTables(
      rpcClient({
        data: [
          { relname: 'quotes', relrowsecurity: true },
          { relname: 'orders', relrowsecurity: false },
        ],
      }),
    );
    expect(rows.map((row: Row) => row.relname)).toEqual(['orders', 'quotes']);
  });
});

describe('resumo de RLS', () => {
  it('só é conforme com todas as tabelas com RLS, e nunca com zero tabelas', () => {
    expect(summarizeRls([])).toMatchObject({ compliant: false, pct: 0, total: 0 });
    expect(summarizeRls([{ relname: 'a', relrowsecurity: true }])).toMatchObject({ compliant: true, pct: 100 });
  });

  it('não arredonda cobertura parcial para 100%', () => {
    const rows: Row[] = Array.from({ length: 2000 }, (_, i) => ({ relname: `t${i}`, relrowsecurity: i !== 0 }));
    const summary = summarizeRls(rows);
    expect(summary.pct).toBeLessThan(100);
    expect(summary).toMatchObject({ compliant: false, without: ['t0'], withRls: 1999 });
  });
});

describe('índice de migrations que ligam RLS', () => {
  it('casa variações de sintaxe e fica com a primeira migration de cada tabela', () => {
    const dir = scratch('audit-migrations-');
    writeFileSync(join(dir, '001_a.sql'), 'ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;');
    writeFileSync(
      join(dir, '002_b.sql'),
      [
        'alter table if exists only "public"."Orders"\n  enable row level security;',
        'ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;',
        'ALTER TABLE public.outra DISABLE ROW LEVEL SECURITY;',
      ].join('\n'),
    );
    writeFileSync(join(dir, 'notas.txt'), 'ALTER TABLE public.ignorada ENABLE ROW LEVEL SECURITY;');

    const index = indexRlsMigrations(dir);
    expect(index.get('quotes')).toMatch(/001_a\.sql$/);
    expect(index.get('orders')).toMatch(/002_b\.sql$/);
    expect(index.has('outra')).toBe(false);
    expect(index.has('ignorada')).toBe(false);
  });

  it('diretório ausente devolve índice vazio', () => {
    expect(indexRlsMigrations(join(tmpdir(), 'nao-existe-audit-9f3a')).size).toBe(0);
  });
});

describe('utilitários do módulo de auditoria', () => {
  it('conta só edge functions publicáveis', () => {
    const dir = scratch('audit-functions-');
    for (const name of ['a', 'b', '_shared', 'tests']) mkdirSync(join(dir, name));
    writeFileSync(join(dir, 'a', 'index.ts'), '');
    writeFileSync(join(dir, 'b', 'index.ts'), '');
    writeFileSync(join(dir, '_shared', 'index.ts'), '');
    writeFileSync(join(dir, 'solto.ts'), '');
    expect(countEdgeFunctions(dir)).toBe(2);
  });

  it('gera um arquivo de exportação por combinação de filtros', () => {
    const names = [
      auditExportFileName({}),
      auditExportFileName({ status: 'implementado' }),
      auditExportFileName({ status: 'a-implementar' }),
      auditExportFileName({ status: 'implementado', module: 'Segurança' }),
      auditExportFileName({ module: 'Segurança' }),
    ];
    expect(new Set(names).size).toBe(names.length);
    expect(names[3]).toBe('AUDIT_EXPORT_implementado_Seguranca.md');
    expect(names[0]).toBe('AUDIT_EXPORT_COMPLETO.md');
  });

  it('deriva a URL do repositório do ambiente do Actions', () => {
    expect(repoWebUrl({ env: { GITHUB_REPOSITORY: 'dono/repo', GITHUB_SERVER_URL: 'https://github.com/' } })).toBe(
      'https://github.com/dono/repo',
    );
  });
});

describe('dossiê de auditoria V5', () => {
  const evidence = AUDIT_INVENTORY.map((item) => ({ item, check: verifyEvidence(item, ROOT) }));
  const build = (rows: Row[], ev = evidence) =>
    buildDossier({
      rows,
      migrationOf: new Map([['quotes', 'supabase/migrations/001.sql']]),
      gitInfo: (target?: string) => (target ? 'abc1234 | Autor | data' : null),
      evidence: ev,
      commit: 'abc1234',
      now: new Date('2026-11-09T00:00:00Z'),
    });

  it('declara conformidade só quando a medição sustenta', () => {
    const ok = build([{ relname: 'quotes', relrowsecurity: true }]);
    expect(ok).toContain('✅ Conforme (1/1)');
    expect(ok).toMatch(/Status de Integridade:\*\* ✅/);
    // O único ❌ admitido é o da legenda do resumo ("Status com ✅/❌ foram medidos").
    expect(ok.replace('✅/❌', '')).not.toContain('❌');
    expect(ok).not.toMatch(/10\/10|Compliance Verified/);
  });

  it('tabela sem RLS aparece no status, no checklist e na conclusão', () => {
    const doc = build([
      { relname: 'quotes', relrowsecurity: true },
      { relname: 'orders', relrowsecurity: false },
    ]);
    expect(doc).toContain('❌ Não conforme — sem RLS: `orders`');
    expect(doc).toContain('Este dossiê não atesta conformidade.');
    expect(doc).not.toContain('✅ Conforme');
    expect(doc).toMatch(/Status de Integridade:\*\* ❌/);
  });

  it('evidência quebrada derruba a integridade mesmo com RLS completo', () => {
    const broken = [{ item: AUDIT_INVENTORY[0], check: { ok: false, checked: true, reason: 'arquivo não existe: x' } }];
    const doc = build([{ relname: 'quotes', relrowsecurity: true }], broken);
    expect(doc).toMatch(/Status de Integridade:\*\* ❌/);
    expect(doc).toContain('❌ arquivo não existe: x');
  });

  it('rotula o que não mede e mantém a tabela íntegra com nome hostil', () => {
    const doc = build([{ relname: 'a|b\nc', relrowsecurity: true }]);
    expect(doc).toContain(DECLARED);
    expect(doc).toContain('| a\\|b c | ✅ |');
  });
});

describe('relatório enterprise V6', () => {
  const client = (rows: Row[], head: { count?: number | null; error?: unknown; status?: number }) => ({
    ...rpcClient({ data: rows }),
    from: () => ({ select: async () => ({ count: head.count ?? null, error: head.error ?? null, status: head.status ?? 200 }) }),
  });

  it('lê a contagem de logs de `count` e mede a cobertura real', async () => {
    const stats = await getStats(
      client(
        [
          { relname: 'quotes', relrowsecurity: true },
          { relname: 'orders', relrowsecurity: false },
          { relname: 'payments', relrowsecurity: false },
        ],
        { count: 4321 },
      ),
    );
    expect(stats.auditLogs).toBe(4321);
    expect(stats.rls).toMatchObject({ total: 3, withRls: 1, compliant: false });

    const report = buildReport(stats, new Date('2026-11-09T00:00:00Z'));
    expect(report).toContain('1 de 3 (cobertura de 33.3%)');
    expect(report).toContain('`orders`, `payments`');
    expect(report).toContain('4321 registros');
    expect(report).not.toMatch(/Cobertura de 100%/);
    expect(report).toContain('--module=Segurança');
    expect(report).toContain('--status=a-implementar');
  });

  it('falha quando a contagem de logs não vem do banco', async () => {
    const rows = [{ relname: 'quotes', relrowsecurity: true }];
    await expect(getStats(client(rows, { error: { message: '' }, status: 401 }))).rejects.toThrow(/HTTP 401/);
    await expect(getStats(client(rows, { count: null }))).rejects.toThrow(/não devolvida/);
  });
});

describe('exportação filtrada', () => {
  it('não chama de implementado o item sem evidência', () => {
    const [first] = AUDIT_INVENTORY;
    const doc = buildExport({
      items: [
        { item: first, check: { ok: true, checked: true } },
        { item: { ...first, feature: 'Fantasma' }, check: { ok: false, checked: true, reason: 'arquivo não existe: z' } },
      ],
      moduleFilter: undefined,
      statusFilter: 'implementado',
      commitInfo: () => null,
    });
    expect(doc).toContain('✅ Implementado (evidência conferida)');
    expect(doc).toContain('❌ Declarado implementado, mas arquivo não existe: z');
    expect(doc).toContain('N/A (sem commits para este caminho)');
  });
});

describe('validador de links de auditoria', () => {
  it('extrai URLs sem a pontuação colada e sem duplicar', () => {
    const md = [
      'Veja https://example.com/ok. e **https://example.com/negrito**,',
      'o código `https://example.com/code`, o link [x](https://example.com/md) e',
      '<https://example.com/angular> além de https://example.com/ok de novo.',
      'Mantém query: https://example.com/q?a=1&b=2 e âncora https://example.com/p#secao;',
    ].join('\n');
    expect(extractLinks(md)).toEqual([
      'https://example.com/ok',
      'https://example.com/negrito',
      'https://example.com/code',
      'https://example.com/md',
      'https://example.com/angular',
      'https://example.com/q?a=1&b=2',
      'https://example.com/p#secao',
    ]);
    expect(extractLinks('sem links aqui; http:// nem isto')).toEqual([]);
  });

  it('inclui os documentos gerados nesta execução além dos versionados', () => {
    const generated = scratch('audit-generated-');
    writeFileSync(join(generated, 'DOSSIA_AUDITORIA_ENTERPRISE_V5.md'), '');
    writeFileSync(join(generated, 'AUDIT_EXPORT_implementado.md'), '');
    writeFileSync(join(generated, 'rls-status.txt'), '');

    const targets = resolveTargets({ positional: [], docsDir: 'docs/audits', generatedDir: generated });
    expect(targets.filter((target: { required: boolean }) => target.required)).toHaveLength(3);
    expect(targets.filter((target: { required: boolean }) => !target.required).map((t: { path: string }) => t.path)).toEqual([
      join(generated, 'AUDIT_EXPORT_implementado.md'),
      join(generated, 'DOSSIA_AUDITORIA_ENTERPRISE_V5.md'),
    ]);
  });

  it('argumentos posicionais substituem a lista padrão', () => {
    expect(resolveTargets({ positional: ['a.md'], docsDir: 'docs/audits', generatedDir: 'nao-existe' })).toEqual([
      { path: 'a.md', label: 'a.md', required: true },
    ]);
  });
});

describe('geradores de auditoria como processo (Supabase falso)', () => {
  let server: Server | undefined;
  afterEach(() => server?.close());

  const startFake = (mode: 'ok' | 'rpc-erro') =>
    new Promise<string>((done) => {
      server = createServer((req, res) => {
        if (req.url?.startsWith('/rest/v1/rpc/check_tables_rls')) {
          if (mode === 'rpc-erro') {
            res.writeHead(404, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ message: 'Could not find the function public.check_tables_rls' }));
            return;
          }
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify([{ relname: 'quotes', relrowsecurity: true }]));
          return;
        }
        res.writeHead(200, { 'content-type': 'application/json', 'content-range': '0-0/7' });
        res.end();
      });
      server.listen(0, '127.0.0.1', () => done(`http://127.0.0.1:${(server!.address() as AddressInfo).port}`));
    });

  const run = (script: string, url: string, outDir: string) =>
    new Promise<{ code: number | null; output: string }>((done) => {
      const child = spawn(process.execPath, [script], {
        cwd: ROOT,
        env: { ...process.env, VITE_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: 'fake', AUDIT_REPORTS_DIR: outDir },
      });
      let output = '';
      child.stdout.on('data', (chunk) => (output += chunk));
      child.stderr.on('data', (chunk) => (output += chunk));
      child.on('close', (code) => done({ code, output }));
    });

  it('RPC com erro reprova o dossiê e o relatório, sem gravar saída', async () => {
    const url = await startFake('rpc-erro');
    for (const script of ['scripts/generate-audit-dossier.mjs', 'scripts/generate-enterprise-report.mjs']) {
      const outDir = scratch('audit-out-');
      const { code, output } = await run(script, url, outDir);
      expect(code, output).toBe(1);
      expect(output).toContain('RPC check_tables_rls falhou');
      expect(readdirSync(outDir)).toEqual([]);
    }
  }, 30_000);

  it('execução saudável grava em AUDIT_REPORTS_DIR com os números medidos', async () => {
    const url = await startFake('ok');
    const outDir = scratch('audit-out-');

    const dossier = await run('scripts/generate-audit-dossier.mjs', url, outDir);
    expect(dossier.code, dossier.output).toBe(0);
    expect(readFileSync(join(outDir, 'DOSSIA_AUDITORIA_ENTERPRISE_V5.md'), 'utf8')).toContain('✅ Conforme (1/1)');

    const report = await run('scripts/generate-enterprise-report.mjs', url, outDir);
    expect(report.code, report.output).toBe(0);
    expect(readFileSync(join(outDir, 'ENTERPRISE_AUDIT_REPORT_V6.md'), 'utf8')).toContain('7 registros');
  }, 30_000);
});
