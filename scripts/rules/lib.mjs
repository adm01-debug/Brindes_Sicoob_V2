import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const sh = (cmd, args, cwd, timeout = 180000) =>
  spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });

/** Migrations em ordem de aplicação (o nome começa com timestamp). */
export function readMigrations(root) {
  const dir = join(root, 'supabase/migrations');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ file: f, sql: readFileSync(join(dir, f), 'utf8') }));
}

/** Remove comentários SQL (-- e /* *\/) para o parse por regex não casar texto comentado. */
export const stripSqlComments = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');

/** Diretórios em supabase/functions que são funções de verdade (têm index.ts/js). */
export function edgeFunctions(root) {
  const dir = join(root, 'supabase/functions');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() && !n.startsWith('_') && n !== 'tests' &&
      (existsSync(join(p, 'index.ts')) || existsSync(join(p, 'index.js')));
  });
}
