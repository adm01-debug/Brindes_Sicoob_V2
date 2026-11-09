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

/**
 * Remove comentários SQL (-- e /* *\/, estes aninháveis) RESPEITANDO literais: 'texto' (com '' e E'\\'),
 * "identificador" e corpos $tag$...$tag$ (onde remove comentários recursivamente, pois o corpo é código).
 * Um `--` dentro de string NÃO é comentário; remover isso cortaria SQL executável em silêncio.
 */
export function stripSqlComments(sql) {
  const n = sql.length;
  let out = '';
  let i = 0;
  while (i < n) {
    const c = sql[i];
    const c2 = sql[i + 1];
    if (c === '-' && c2 === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && c2 === '*') {
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') { depth++; i += 2; }
        else if (sql[i] === '*' && sql[i + 1] === '/') { depth--; i += 2; }
        else i++;
      }
      out += ' ';
      continue;
    }
    if (c === "'") {
      const escapes = /[eE]$/.test(out) && !/\w/.test(out[out.length - 2] ?? ' '); // E'...' aceita \'
      let j = i + 1;
      while (j < n) {
        if (escapes && sql[j] === '\\') { j += 2; continue; }
        if (sql[j] === "'") { if (sql[j + 1] === "'") { j += 2; continue; } break; }
        j++;
      }
      out += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < n) { if (sql[j] === '"') { if (sql[j + 1] === '"') { j += 2; continue; } break; } j++; }
      out += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === '$' && !/[\w$]/.test(out[out.length - 1] ?? ' ')) {
      const m = /^\$(?:[A-Za-z_]\w*)?\$/.exec(sql.slice(i, i + 80));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        if (end < 0) { out += sql.slice(i); break; }
        out += tag + stripSqlComments(sql.slice(i + tag.length, end)) + tag;
        i = end + tag.length;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}

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
