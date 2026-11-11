import { readMigrations, stripSqlComments, mascararCorposDeFuncao } from '../lib.mjs';

// Nome de tabela, com ou sem "public." e aspas.
const NAME = String.raw`(?:"?public"?\s*\.\s*)?"?([a-z_][a-z0-9_]*)"?`;

// Identificador do Postgres: sem aspas vira minúsculo; entre aspas mantém a caixa e perde as aspas ("p" == p, "P" != p).
const ident = (s) => (s.startsWith('"') ? s.slice(1, -1).replace(/""/g, '"') : s.toLowerCase());

const SQL_WORDS = new Set(['if', 'not', 'exists', 'as', 'only', 'public']);

/**
 * Replay estático das migrations. Limitação conhecida: SQL dinâmico geral (DO $$ ... format(...))
 * e RENAME não são seguidos — por isso o resultado é um LEVANTAMENTO, não prova.
 *
 * Dois padrões dinâmicos de RLS SÃO entendidos, porque o projeto os usa nas partições de admin_audit_log:
 *   - `FOR t IN SELECT tablename FROM pg_tables WHERE tablename LIKE 'prefixo%' ... EXECUTE format('ALTER TABLE ... %I ENABLE ROW LEVEL SECURITY')`
 *   - `FOREACH p IN ARRAY ARRAY['a','b'] LOOP EXECUTE format('ALTER TABLE ... %I ENABLE ROW LEVEL SECURITY')`
 * Sem isso, `rls-particao-sem-rls` acusava 18 partições que já têm RLS.
 */
export function analyze(migrations) {
  const tables = new Map(); // nome -> { file, rls, policies, partition }
  const dynamic = new Set();
  for (const { file, sql: raw } of migrations) {
    const todo = stripSqlComments(raw);
    const sql = mascararCorposDeFuncao(todo); // DDL executado: o texto dentro de corpos de função é código armazenado
    if (/execute\s+format\s*\([^;]*row level security/i.test(todo)) dynamic.add(file);
    // Coleta os comandos com a posição e aplica NA ORDEM do SQL (DROP seguido de CREATE recria a tabela).
    const events = [];
    for (const m of sql.matchAll(/create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?(?:"?([a-z_][a-z0-9_]*)"?\.)?"?([a-z_][a-z0-9_]*)"?(?![\w."'])([^;]{0,200})/gi)) {
      if (m[1] && m[1].toLowerCase() !== 'public') continue; // outro schema
      if (SQL_WORDS.has(m[2].toLowerCase())) continue; // SQL dentro de string/format()
      events.push({ pos: m.index, type: 'create', name: m[2].toLowerCase(), partition: /^\s*partition\s+of\b/i.test(m[3]) });
    }
    for (const m of sql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?([^;]+)/gi)) {
      // `ALTER PUBLICATION ... DROP TABLE t` só tira t da publicação; a tabela continua existindo.
      if (/alter\s+publication\b/i.test(sql.slice(sql.lastIndexOf(';', m.index) + 1, m.index))) continue;
      // `DROP TABLE a, b CASCADE` remove as duas; só a primeira era lida.
      for (const raw of m[1].replace(/\b(?:cascade|restrict)\b[\s\S]*$/i, '').split(',')) {
        const name = raw.trim().replace(/^"?public"?\s*\.\s*/i, '').replace(/^"|"$/g, '').toLowerCase();
        if (/^[a-z_][a-z0-9_]*$/.test(name)) events.push({ pos: m.index, type: 'drop', name });
      }
    }
    for (const m of sql.matchAll(new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?` + NAME + String.raw`\s+(enable|disable|force)\s+row\s+level\s+security`, 'gi'))) {
      if (m[2].toLowerCase() !== 'force') events.push({ pos: m.index, type: 'rls', name: m[1].toLowerCase(), on: m[2].toLowerCase() === 'enable' });
    }
    const POL = String.raw`("[^"]+"|\w+)\s+on\s+`;
    for (const m of sql.matchAll(new RegExp(String.raw`create\s+policy\s+` + POL + NAME, 'gi'))) events.push({ pos: m.index, type: 'policy', policy: ident(m[1]), name: m[2].toLowerCase() });
    for (const m of sql.matchAll(new RegExp(String.raw`drop\s+policy\s+(?:if\s+exists\s+)?` + POL + NAME, 'gi'))) events.push({ pos: m.index, type: 'droppolicy', policy: ident(m[1]), name: m[2].toLowerCase() });
    for (const e of events.sort((x, y) => x.pos - y.pos)) {
      if (e.type === 'create') { if (!tables.has(e.name)) tables.set(e.name, { file, rls: false, policies: 0, policyNames: new Set(), partition: e.partition }); }
      else if (e.type === 'drop') tables.delete(e.name);
      else if (e.type === 'rls') { const t = tables.get(e.name); if (t) t.rls = e.on; }
      else if (e.type === 'policy') { const t = tables.get(e.name); if (t) { t.policyNames.add(e.policy); t.policies = t.policyNames.size; } }
      else { const t = tables.get(e.name); if (t) { t.policyNames.delete(e.policy); t.policies = t.policyNames.size; } }
    }
    // SQL dinâmico que liga RLS (ver o cabeçalho): aplicado no fim do arquivo, sobre as tabelas que já existem.
    if (/execute\s+format\s*\(\s*\$?\w*\$?\s*'?\s*alter\s+table[^;]*?enable\s+row\s+level\s+security/i.test(todo)) {
      // As policies do mesmo laço (`CREATE POLICY "x" ON public.%I ...`) também nascem dinamicamente.
      const policies = [...todo.matchAll(/create\s+policy\s+("[^"]+"|\w+)\s+on\s+(?:public\.)?%I/gi)].map((m) => ident(m[1]));
      const ligar = (t) => {
        t.rls = true;
        for (const policy of policies) t.policyNames.add(policy);
        t.policies = t.policyNames.size;
      };
      for (const m of todo.matchAll(/tablename\s+like\s+'([a-z0-9_]+)%'/gi)) {
        for (const [name, t] of tables) if (name.startsWith(m[1].toLowerCase())) ligar(t);
      }
      for (const m of todo.matchAll(/foreach\s+\w+\s+in\s+array\s+array\s*\[([^\]]*)\]/gi)) {
        for (const lit of m[1].matchAll(/'([a-z_][a-z0-9_]*)'/gi)) {
          const t = tables.get(lit[1].toLowerCase());
          if (t) ligar(t);
        }
      }
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
