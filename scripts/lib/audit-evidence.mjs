/**
 * Fonte única dos scripts de auditoria (generate-audit-dossier, generate-enterprise-report,
 * audit-export, enterprise-dossier-builder, test-audit-scripts, validate-audit-links).
 *
 * Regra do módulo: nenhum status "conforme/implementado" é literal. Todo status sai de uma
 * medição (resposta da RPC `check_tables_rls`, arquivo que existe e contém o trecho citado).
 * O que não é medido é rotulado como declaração, nunca como verificado.
 *
 * Sem dependências externas: `node:fs`, `node:path`, `node:child_process`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/** Status de item não medido pela execução: declaração de projeto, não evidência. */
export const DECLARED = '📝 Declarado (não medido nesta execução)';

/**
 * Inventário de compliance. Item `implementado` exige `path` existente no repositório contendo
 * `quote`; `verifyEvidence` reprova o que não se sustenta.
 */
export const AUDIT_INVENTORY = [
  {
    module: 'Segurança',
    feature: 'RLS Cross-Tenant',
    status: 'implementado',
    path: 'supabase/migrations/20260502143127_cebe731a-273c-4205-8836-c8819504e437.sql',
    quote: 'current_user_cooperativa_id',
  },
  {
    module: 'Financeiro',
    feature: 'Precisão 4 Casas',
    status: 'implementado',
    path: 'supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql',
    quote: 'unit_price numeric(14,4)',
  },
  {
    module: 'IA',
    feature: 'Fallback Automático',
    status: 'implementado',
    path: 'supabase/functions/_shared/ai-usage.ts',
    quote: 'callAiWithFallback',
  },
  {
    module: 'Infra',
    feature: 'Cold Storage Logs',
    status: 'implementado',
    path: 'supabase/migrations/20260504221011_e1ce4e59-35af-4b99-8f3d-83b2f344e307.sql',
    quote: 'admin_audit_log_archive',
  },
  {
    module: 'Infra',
    feature: 'Blockchain Audit Trail',
    status: 'a-implementar',
    path: 'roadmap/ledger-integration',
  },
];

export const AUDIT_MODULES = [...new Set(AUDIT_INVENTORY.map((item) => item.module))];
export const AUDIT_STATUSES = [...new Set(AUDIT_INVENTORY.map((item) => item.status))];

/**
 * Confere a evidência de um item. `a-implementar` não tem evidência a conferir.
 * @returns {{ ok: boolean, checked: boolean, reason?: string }}
 */
export function verifyEvidence(item, root = process.cwd()) {
  if (item.status !== 'implementado') return { ok: true, checked: false };
  const file = path.resolve(root, item.path);
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return { ok: false, checked: true, reason: `arquivo não existe: ${item.path}` };
  }
  if (!item.quote) return { ok: true, checked: true };
  if (!stat.isFile()) {
    return { ok: false, checked: true, reason: `${item.path} não é arquivo; trecho não conferível` };
  }
  if (!fs.readFileSync(file, 'utf8').includes(item.quote)) {
    return { ok: false, checked: true, reason: `trecho "${item.quote}" ausente em ${item.path}` };
  }
  return { ok: true, checked: true };
}

/** Último commit que tocou `target`, sem passar pelo shell. `null` quando não há histórico. */
export function lastCommitInfo(target, { cwd = process.cwd(), format = '%h | %an | %ad', date } = {}) {
  if (!target) return null;
  try {
    const args = ['log', '-1', `--format=${format}`, ...(date ? [`--date=${date}`] : []), '--', target];
    const out = execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export function headCommit({ cwd = process.cwd() } = {}) {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/** URL web do repositório: env do GitHub Actions ou `origin` (https, ssh ou proxy local). */
export function repoWebUrl({ cwd = process.cwd(), env = process.env } = {}) {
  if (env.GITHUB_REPOSITORY) {
    return `${(env.GITHUB_SERVER_URL || 'https://github.com').replace(/\/+$/, '')}/${env.GITHUB_REPOSITORY}`;
  }
  let remote = '';
  try {
    remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
  const match = remote.replace(/\.git$/, '').match(/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  return match ? `https://github.com/${match[1]}/${match[2]}` : null;
}

/** Diretório das saídas geradas (artifact do `security-compliance.yml`). */
export function reportsDir(env = process.env) {
  const dir = env.AUDIT_REPORTS_DIR || 'reports';
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** `Segurança` → `Seguranca`; mantém `a-implementar`. Vazio vira string vazia. */
export function slug(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Um arquivo por combinação de filtros: exportações sucessivas não se sobrescrevem. */
export function auditExportFileName({ module: moduleFilter, status } = {}) {
  const parts = [slug(status), slug(moduleFilter)].filter(Boolean);
  return `AUDIT_EXPORT_${parts.length > 0 ? parts.join('_') : 'COMPLETO'}.md`;
}

/**
 * Lê a RPC `check_tables_rls`. supabase-js não lança em erro de RPC: devolve `{ error }`.
 * Erro, resposta que não é lista ou lista vazia viram exceção — um banco real tem tabelas,
 * e "zero tabelas" lido como "100% conforme" é o falso verde que este módulo existe para impedir.
 */
export async function fetchRlsTables(supabase) {
  const { data, error } = await supabase.rpc('check_tables_rls');
  if (error) throw new Error(`RPC check_tables_rls falhou: ${error.message ?? JSON.stringify(error)}`);
  if (!Array.isArray(data)) throw new Error('RPC check_tables_rls não devolveu uma lista.');
  if (data.length === 0) throw new Error('RPC check_tables_rls devolveu zero tabelas.');
  for (const row of data) {
    if (typeof row?.relname !== 'string' || typeof row?.relrowsecurity !== 'boolean') {
      throw new Error('RPC check_tables_rls devolveu linha sem relname/relrowsecurity.');
    }
  }
  return [...data].sort((a, b) => a.relname.localeCompare(b.relname));
}

export function summarizeRls(rows) {
  const without = rows.filter((row) => !row.relrowsecurity).map((row) => row.relname);
  const total = rows.length;
  const withRls = total - without.length;
  return {
    total,
    withRls,
    without,
    compliant: total > 0 && without.length === 0,
    // Trunca em vez de arredondar: 287/288 não pode aparecer como 100%.
    pct: total === 0 ? 0 : Math.floor((withRls / total) * 1000) / 10,
  };
}

const ENABLE_RLS =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:"?public"?\s*\.\s*)?"?([A-Za-z_][A-Za-z0-9_$]*)"?\s+enable\s+row\s+level\s+security/gi;

/** Mapa tabela → primeira migration (ordem de nome) que liga o RLS daquela tabela. */
export function indexRlsMigrations(dir = 'supabase/migrations') {
  const index = new Map();
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((name) => name.endsWith('.sql')).sort();
  } catch {
    return index;
  }
  for (const name of files) {
    const file = path.posix.join(dir.split(path.sep).join('/'), name);
    const sql = fs.readFileSync(path.join(dir, name), 'utf8');
    for (const match of sql.matchAll(ENABLE_RLS)) {
      const table = match[1].toLowerCase();
      if (!index.has(table)) index.set(table, file);
    }
  }
  return index;
}

/** Edge functions publicáveis: diretórios com `index.ts` (exclui `_shared`, `tests` etc.). */
export function countEdgeFunctions(dir = 'supabase/functions') {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .filter((entry) => fs.existsSync(path.join(dir, entry.name, 'index.ts'))).length;
  } catch {
    return 0;
  }
}

/** Texto seguro para célula de tabela markdown. */
export function cell(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replace(/[\r\n]+/g, ' ');
}
