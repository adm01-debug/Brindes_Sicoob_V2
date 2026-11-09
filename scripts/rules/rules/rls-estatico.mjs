import { readMigrations, stripSqlComments } from '../lib.mjs';

// Nome de tabela, com ou sem "public." e aspas.
const NAME = String.raw`(?:public\.)?"?([a-z_][a-z0-9_]*)"?`;

const SQL_WORDS = new Set(['if', 'not', 'exists', 'as', 'only', 'public']);

/**
 * Replay estático das migrations. Limitação conhecida: SQL dinâmico (DO $$ ... format(...))
 * e RENAME não são seguidos — por isso o resultado é um LEVANTAMENTO, não prova.
 */
export function analyze(migrations) {
  const tables = new Map(); // nome -> { file, rls, policies }
  const dynamic = new Set();
  for (const { file, sql: raw } of migrations) {
    const sql = stripSqlComments(raw);
    if (/execute\s+format\s*\([^;]*row level security/i.test(sql)) dynamic.add(file);
    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?([a-z_][a-z0-9_]*)"?\.)?"?([a-z_][a-z0-9_]*)"?(?![\w."'])([^;]{0,200})/gi)) {
      if (m[1] && m[1].toLowerCase() !== 'public') continue; // outro schema
      if (SQL_WORDS.has(m[2].toLowerCase())) continue; // SQL dentro de string/format()
      if (!tables.has(m[2])) tables.set(m[2], { file, rls: false, policies: 0, partition: /^\s*partition\s+of\b/i.test(m[3]) });
    }
    for (const m of sql.matchAll(new RegExp(String.raw`drop\s+table\s+(?:if\s+exists\s+)?` + NAME, 'gi'))) tables.delete(m[1]);
    for (const m of sql.matchAll(new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?` + NAME + String.raw`\s+(enable|disable|force)\s+row\s+level\s+security`, 'gi'))) {
      const t = tables.get(m[1]);
      if (t && m[2].toLowerCase() !== 'force') t.rls = m[2].toLowerCase() === 'enable';
    }
    for (const m of sql.matchAll(new RegExp(String.raw`create\s+policy\s+(?:"[^"]+"|\w+)\s+on\s+` + NAME, 'gi'))) {
      const t = tables.get(m[1]);
      if (t) t.policies += 1;
    }
  }
  return { tables, dynamic };
}

const cache = new WeakMap();
const get = (ctx) => cache.get(ctx) ?? (cache.set(ctx, analyze(readMigrations(ctx.root))), cache.get(ctx));

export default [
  {
    id: 'rls-particao-sem-rls',
    kind: 'gap',
    severity: 'media',
    title: 'Partições (PARTITION OF) sem RLS próprio — o PostgREST expõe cada partição como tabela; RLS do pai não vale no acesso direto',
    fix: 'ENABLE ROW LEVEL SECURITY em cada partição (ou REVOKE dos papéis anon/authenticated nelas) via migration nova',
    run(ctx) {
      const { tables } = get(ctx);
      return { items: [...tables].filter(([, t]) => !t.rls && t.partition).map(([n, t]) => `public.${n}  (criada em ${t.file})`).sort() };
    },
  },
  {
    id: 'rls-tabela-sem-rls',
    kind: 'falha',
    severity: 'alta',
    title: 'Tabelas criadas em migrations sem ENABLE ROW LEVEL SECURITY (análise estática)',
    fix: 'nova migration com ALTER TABLE ... ENABLE ROW LEVEL SECURITY + policies (nunca editar migration existente)',
    run(ctx) {
      const { tables, dynamic } = get(ctx);
      const items = [...tables].filter(([, t]) => !t.rls && !t.partition).map(([n, t]) => `public.${n}  (criada em ${t.file})`).sort();
      return { items, note: dynamic.size ? `${dynamic.size} migration(s) usam SQL dinâmico para RLS — itens podem ser falso positivo; confirme com scripts/scan-rls-security.mjs (precisa de service key)` : undefined };
    },
  },
  {
    id: 'rls-sem-policy',
    kind: 'gap',
    severity: 'media',
    title: 'Tabelas com RLS ligado e nenhuma policy (nega tudo, exceto service role) — confirmar se é intencional',
    fix: 'criar policies ou documentar que a tabela é só de service role',
    run(ctx) {
      const { tables } = get(ctx);
      return { items: [...tables].filter(([, t]) => t.rls && t.policies === 0).map(([n, t]) => `public.${n}  (criada em ${t.file})`).sort() };
    },
  },
];
