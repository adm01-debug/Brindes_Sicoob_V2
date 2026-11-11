/**
 * Regras derivadas de docs/plano-melhorias-50-etapas.md (cada uma cita a etapa em `source`).
 * Só entram etapas verificáveis por código e que nenhum gate do CI cobre. O doc de correções
 * (correcoes-validacao-2026-09-13.md) mostra que várias premissas do plano estavam erradas —
 * por isso cada regra foi validada contra a base real antes de entrar aqui.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { sh, readMigrations, stripSqlComments, fimDeLiteral, mascararCorposDeFuncao } from '../lib.mjs';

const isTestPath = (p) => /(?:^|\/)(?:tests?|__tests__|__mocks__|e2e)\/|\.(?:test|spec)\.[tj]sx?$/.test(p);
const srcFiles = (ctx) =>
  ctx.walk(join(ctx.root, 'src'))
    .map((f) => relative(ctx.root, f))
    .filter((f) => /\.(?:ts|tsx|js|jsx)$/.test(f) && !f.endsWith('.d.ts') && !isTestPath(f) && !f.includes('integrations/supabase/types'));
const top = (rows, n = 40) => rows.sort((a, b) => b[1] - a[1]).slice(0, n);

// ---- etapa 27: SECURITY DEFINER sem search_path --------------------------------------------
export function definerSemSearchPath(migrations) {
  const fns = new Map(); // nome -> { file, definer, searchPath }
  for (const { file, sql: raw } of migrations) {
    const sql = stripSqlComments(raw);
    const exec = mascararCorposDeFuncao(sql); // DDL executado: sem o texto armazenado dentro de corpos de função
    // Coleta os comandos com a posição e aplica NA ORDEM do SQL (DROP seguido de CREATE deixa a função existir).
    const events = [];
    const re = /create\s+(?:or\s+replace\s+)?function\s+(?:"?public"?\s*\.\s*)?"?([a-z_][a-z0-9_]*)"?\s*\(/gi;
    let m;
    while ((m = re.exec(sql))) {
      const name = m[1].toLowerCase();
      const bodyStart = sql.slice(m.index).search(/\bas\s+(\$[\w]*\$|')/i);
      if (bodyStart < 0) continue;
      const from = m.index + bodyStart;
      const tagMatch = /\bas\s+(\$[\w]*\$|')/i.exec(sql.slice(from));
      const tag = tagMatch[1];
      const bodyOpen = from + tagMatch[0].length;
      const bodyClose = tag === "'" ? fimDeLiteral(sql, bodyOpen) : sql.indexOf(tag, bodyOpen);
      const head = sql.slice(m.index, from);
      const tail = bodyClose < 0 ? '' : sql.slice(bodyClose + tag.length, (sql.indexOf(';', bodyClose + tag.length) + 1) || undefined);
      const attrs = (head + ' ' + tail).toLowerCase();
      events.push({ pos: m.index, type: 'create', name, definer: /security\s+definer/.test(attrs), searchPath: /set\s+"?search_path"?/.test(attrs) });
      re.lastIndex = bodyClose > 0 ? bodyClose : re.lastIndex;
    }
    // Endurecimento em lote: DO $$ ... FOR ... IN pg_proc ... EXECUTE format('ALTER FUNCTION ... SET search_path ...').
    // Cobre toda função pública já existente neste ponto; CREATE OR REPLACE posterior sem SET volta a ficar exposta.
    const bulk = /execute\s+format\s*\(\s*'alter\s+function[^']*set\s+"?search_path"?/i.exec(exec);
    if (bulk && /pg_proc/i.test(exec)) events.push({ pos: bulk.index, type: 'bulk' });
    for (const a of exec.matchAll(/alter\s+function\s+(?:"?public"?\s*\.\s*)?"?([a-z_][a-z0-9_]*)"?[^;]*?set\s+"?search_path"?/gi)) events.push({ pos: a.index, type: 'alter', name: a[1].toLowerCase() });
    for (const d of exec.matchAll(/drop\s+function\s+(?:if\s+exists\s+)?(?:"?public"?\s*\.\s*)?"?([a-z_][a-z0-9_]*)"?/gi)) events.push({ pos: d.index, type: 'drop', name: d[1].toLowerCase() });
    for (const e of events.sort((x, y) => x.pos - y.pos)) {
      if (e.type === 'create') fns.set(e.name, { file, definer: e.definer, searchPath: e.searchPath });
      else if (e.type === 'bulk') for (const f of fns.values()) f.searchPath = true;
      else if (e.type === 'alter') { const f = fns.get(e.name); if (f) f.searchPath = true; }
      else fns.delete(e.name);
    }
  }
  return [...fns].filter(([, f]) => f.definer && !f.searchPath).map(([n, f]) => `${n}()  (última definição em ${f.file})`).sort();
}

export default [
  {
    id: 'plano-definer-sem-search-path',
    source: 'plano etapa 27',
    kind: 'falha', severity: 'alta',
    title: 'Funções SECURITY DEFINER sem SET search_path (risco de sequestro de search_path)',
    fix: 'migration nova: ALTER FUNCTION <nome>(...) SET search_path = public, pg_temp; (nunca editar a migration antiga)',
    run(ctx) {
      return { items: definerSemSearchPath(readMigrations(ctx.root)), note: 'estático: última definição por nome (sobrecargas se fundem); confirmar no Postgres real (pg_proc.proconfig)' };
    },
  },
  {
    id: 'plano-artefatos-versionados',
    source: 'plano etapas 9 e 10',
    kind: 'falha', severity: 'baixa',
    title: 'Artefatos gerados ou arquivos grandes controlados pelo git',
    fix: 'git rm --cached + .gitignore (gerados); mover binários grandes para fora de public/',
    run(ctx) {
      const tracked = sh('git', ['ls-files', '-z'], ctx.root).stdout.split('\0').filter(Boolean);
      const generated = /^(?:dependencies\.json|api_usage\.json|service_map\.txt|triage-edge-typecheck\.json|audit_report\.pdf)$|\.tsbuildinfo$/;
      const items = tracked.filter((f) => generated.test(f)).map((f) => `${f}  (gerado)`);
      for (const f of tracked.filter((p) => p.startsWith('public/') && existsSync(join(ctx.root, p)))) {
        const mb = statSync(join(ctx.root, f)).size / 1048576;
        if (mb >= 1 && /\.(?:pdf|zip|mp4|mov|psd|ai)$/i.test(f)) items.push(`${f}  (${mb.toFixed(1)} MB servido no bundle)`);
      }
      return { items };
    },
  },
  {
    id: 'plano-pastas-de-teste',
    source: 'plano etapa 13',
    kind: 'melhoria', severity: 'baixa',
    title: 'Mais de uma convenção de pasta de testes em uso',
    fix: 'consolidar numa convenção só (decisão de estrutura — não automatizável)',
    run(ctx) {
      const roots = ['tests', 'src/tests', 'src/test'];
      const counts = roots.map((r) => [r, ctx.walk(join(ctx.root, r)).filter((f) => /\.(?:test|spec)\.[tj]sx?$/.test(f)).length]).filter(([, n]) => n > 0);
      // `roots` fixo só via o nível raiz de `src/__tests__`: um `__tests__` ANINHADO (ex.:
      // src/components/foo/__tests__/Bar.test.tsx) não cai nele, e a exclusão abaixo também o
      // descarta do "colocado" (o caminho contém /__tests__/) — ficava invisível nos dois lados.
      // Um bucket único varrendo src/ inteiro, em qualquer profundidade, cobre o raso e o aninhado.
      const srcTests = srcFiles({ ...ctx }).length ? ctx.walk(join(ctx.root, 'src')).filter((f) => /\.(?:test|spec)\.[tj]sx?$/.test(f)) : [];
      const nested = srcTests.filter((f) => /\/__tests__\//.test(f)).length;
      if (nested) counts.push(['src/**/__tests__ (qualquer profundidade)', nested]);
      const colocated = srcTests.filter((f) => !/\/(?:tests?|__tests__)\//.test(f)).length;
      if (colocated) counts.push(['src/** (ao lado do código)', colocated]);
      return { items: counts.length > 1 ? counts.map(([r, n]) => `${r}: ${n} arquivo(s) de teste`) : [] };
    },
  },
  {
    id: 'plano-supressoes-sem-motivo',
    source: 'plano etapa 21',
    kind: 'melhoria', severity: 'baixa',
    title: 'eslint-disable / @ts-ignore / @ts-expect-error sem motivo escrito',
    fix: 'acrescentar o motivo (`-- porque ...`) ou remover a supressão; @ts-ignore → @ts-expect-error com descrição',
    run(ctx) {
      const rows = [];
      for (const f of srcFiles(ctx)) {
        let n = 0;
        for (const line of readFileSync(join(ctx.root, f), 'utf8').split('\n')) {
          if (/eslint-disable(?:-next-line|-line)?\b/.test(line) && !/(?:--|:)\s*\S{4,}/.test(line.split(/eslint-disable(?:-next-line|-line)?/)[1] ?? '')) n++;
          else if (/@ts-ignore\b/.test(line)) n++;
          else if (/@ts-expect-error\s*(?:\*\/)?\s*$/.test(line.trim())) n++;
        }
        if (n) rows.push([f, n]);
      }
      const total = rows.reduce((s, [, n]) => s + n, 0);
      return { items: top(rows).map(([f, n]) => `${f}: ${n}`), note: `${total} supressão(ões) sem motivo em ${rows.length} arquivo(s); lista mostra os 40 com mais ocorrências` };
    },
  },
  {
    id: 'plano-arquivos-grandes',
    source: 'plano etapa 23',
    kind: 'melhoria', severity: 'baixa',
    title: 'Arquivos de src com mais de 700 linhas',
    fix: 'quebrar por responsabilidade (refatoração — não automatizável)',
    run(ctx) {
      const rows = srcFiles(ctx).map((f) => [f, readFileSync(join(ctx.root, f), 'utf8').replace(/\n$/, '').split('\n').length]).filter(([, n]) => n > 700);
      return { items: top(rows).map(([f, n]) => `${f}: ${n} linhas`), note: `${rows.length} arquivo(s) acima de 700 linhas` };
    },
  },
  {
    id: 'plano-mockdata-em-producao',
    source: 'plano etapa 42',
    kind: 'falha', severity: 'media',
    title: 'Código de produção importando mockData (dados fictícios com nomes de negócio no bundle)',
    fix: 'trocar pela fonte real (hook/serviço) ou isolar em módulo só de desenvolvimento',
    run(ctx) {
      const items = [];
      for (const f of srcFiles(ctx)) {
        if (/mock/i.test(f)) continue;
        const text = readFileSync(join(ctx.root, f), 'utf8');
        const hit = text.split('\n').findIndex((l) => /^\s*(?:import|export)[^;]*from\s+['"][^'"]*mockData[^'"]*['"]/.test(l));
        if (hit >= 0) items.push(`${f}:${hit + 1}${/isMock/.test(text) ? '  (fallback sinalizado com isMock)' : '  (import direto de dados fictícios)'}`);
      }
      return { items: items.sort() };
    },
  },
  {
    id: 'plano-gates-ausentes',
    source: 'plano etapas 8, 30 e 31',
    kind: 'gap', severity: 'media',
    title: 'Proteções que o plano exige e que não estão ligadas (CI / pre-commit)',
    fix: 'ligar o gate no workflow ou no hook; trocar bun por npm nos workflows',
    run(ctx) {
      const wfDir = join(ctx.root, '.github/workflows');
      const wf = existsSync(wfDir) ? readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f)).map((f) => [f, readFileSync(join(wfDir, f), 'utf8')]) : [];
      const all = wf.map(([, t]) => t).join('\n');
      const hook = existsSync(join(ctx.root, '.husky/pre-commit')) ? readFileSync(join(ctx.root, '.husky/pre-commit'), 'utf8') : '';
      const items = [];
      if (!/check[:-]seller-scope/.test(all)) items.push('check:seller-scope não roda em nenhum workflow (etapa 31)');
      if (!/test[:-]rls\b/.test(all)) items.push('test:rls não roda em nenhum workflow (etapa 31)');
      if (!/gitleaks/i.test(all)) items.push('gitleaks não roda em nenhum workflow (etapa 30)');
      if (!/gitleaks/i.test(hook)) items.push('gitleaks não roda no .husky/pre-commit (etapa 30)');
      const bun = wf.filter(([, t]) => /(?:^|\s)bun(?:x)?\s+(?:install|run|test|x|add)\b/m.test(t)).map(([f]) => f);
      if (bun.length) items.push(`workflows ainda usam bun: ${bun.join(', ')} (etapa 8)`);
      const locks = ['package-lock.json', 'bun.lockb', 'bun.lock', 'pnpm-lock.yaml', 'yarn.lock'].filter((l) => existsSync(join(ctx.root, l)));
      if (locks.length > 1) items.push(`mais de um lockfile: ${locks.join(', ')} (etapa 8)`);
      return { items };
    },
  },
];
