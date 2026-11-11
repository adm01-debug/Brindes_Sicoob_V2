#!/usr/bin/env node
/**
 * check-seller-scope.mjs
 *
 * Checker estático de defesa em profundidade: falha o CI se alguma query
 * Supabase para tabelas críticas do vendedor (quotes, orders,
 * discount_approval_requests) não aplicar escopo de seller.
 *
 * Como lê o código (resolve o que a versão por-linha deixava passar):
 *   - comentários são removidos antes de procurar sinais (`// TODO .eq("seller_id")`
 *     não conta como escopo) e o conteúdo de strings é mascarado para contar
 *     parênteses/colchetes;
 *   - `.from("tabela")` casa em aspas simples, duplas ou template literal, em uma ou
 *     várias linhas, com `as any`/`as const`, e via constante do mesmo arquivo
 *     (`const T = "quotes"; supabase.from(T)`); `storage.from(...)` é ignorado;
 *   - o statement vai do início da expressão que envolve o `.from` (inclui
 *     `applySellerScope(` antes dele) até o `;`, a `,` ou o fecha-parêntese que o
 *     encerra — então `Promise.all([queryA, queryB])` avalia cada query sozinha;
 *   - `supabase.rpc(...)` NÃO conta mais como escopo: é outra consulta, e contá-lo
 *     deixava passar `from("quotes")` seguido de qualquer rpc.
 *
 * Sinais aceitos como "scope aplicado" no statement:
 *   - applySellerScope(
 *   - .eq("seller_id", ...)  /  .in("seller_id", ...)
 *   - .match({ seller_id: ... })
 *   - filter("seller_id", ...)
 *   - .or("seller_id.eq...,seller_id.in...")
 *   - comentário de allowlist na mesma linha ou linha anterior do `.from`:
 *       // rls-allow: <razão>
 *
 * Limitação conhecida: `.from(variavel)` cujo valor não é uma constante string do mesmo
 * arquivo não pode ser classificado e é ignorado.
 *
 * Arquivos varridos: .ts .tsx .js .jsx .mts .cts .mjs em `src/` (testes ignorados).
 *
 * Uso:
 *   node scripts/check-seller-scope.mjs
 *   node scripts/check-seller-scope.mjs --json   # saída para CI
 *
 * Exit: 0 = ok · 1 = violação · 2 = configuração (pasta src/ ausente).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TABLES = ["quotes", "orders", "discount_approval_requests"];
const MAX_STATEMENT_CHARS = 6000;

const SCOPE_SIGNALS = [
  /applySellerScope\s*\(/,
  /\.eq\(\s*["'`]seller_id["'`]\s*,/,
  /\.in\(\s*["'`]seller_id["'`]\s*,/,
  /\.match\(\s*\{\s*[^}]*seller_id\s*:/,
  /\.filter\(\s*["'`]seller_id["'`]\s*,/,
  /\.or\(\s*["'`][^"'`]*seller_id\.(eq|in)/,
];

const ALLOW_INLINE = /\/\/\s*rls-allow\s*:\s*\S+/;

// Diretórios ignorados (testes, mocks, helpers de scope, loggers).
const IGNORE_DIR = new Set(["__tests__", "node_modules", "dist", "build"]);
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const IGNORE_FILE_PATHS = new Set([
  "src/lib/auth/apply-seller-scope.ts",
  "src/lib/security/rls-denial-logger.ts",
]);

/** Remove comentários preservando tamanho e quebras de linha (índices e nº de linha se mantêm). */
export function stripComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === "/" && d === "/") {
      while (i < n && src[i] !== "\n") {
        out += " ";
        i++;
      }
      continue;
    }
    if (c === "/" && d === "*") {
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        out += src[i] === "\n" ? "\n" : " ";
        i++;
      }
      out += "  ";
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += src[i];
        i++;
      }
      out += src[i] ?? "";
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Substitui o conteúdo de strings por "_" (mesmo tamanho) para contar delimitadores sem ruído. */
export function maskStrings(code) {
  let out = "";
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === "\\") {
          out += "__";
          i += 2;
          continue;
        }
        out += code[i] === "\n" ? "\n" : "_";
        i++;
      }
      out += code[i] ?? "";
      continue;
    }
    out += c;
  }
  return out;
}

/** [início, fim) do statement/elemento que contém a chamada em `index`. */
export function statementBounds(masked, index, length) {
  let depth = 0;
  let end = Math.min(masked.length, index + length);
  for (let i = index + length; i < masked.length && i < index + MAX_STATEMENT_CHARS; i++) {
    const c = masked[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) {
      depth--;
      if (depth < 0) {
        end = i;
        break;
      }
    } else if ((c === ";" || c === ",") && depth === 0) {
      end = i;
      break;
    }
    end = i + 1;
  }

  depth = 0;
  let start = index;
  for (let i = index - 1; i >= 0 && i > index - MAX_STATEMENT_CHARS; i--) {
    const c = masked[i];
    if (")]}".includes(c)) depth++;
    else if ("([{".includes(c)) {
      depth--;
      if (depth < 0) {
        start = i + 1;
        if (c === "(") {
          // `applySellerScope(` fica fora dos parênteses: inclui o nome da função que envolve.
          let j = i;
          while (j > 0 && /[\w$.\s]/.test(masked[j - 1])) j--;
          start = j;
        }
        break;
      }
    } else if ((c === ";" || c === ",") && depth === 0) {
      start = i + 1;
      break;
    }
    start = i;
  }
  return [start, end];
}

/**
 * Violações de um arquivo-fonte: `[{ line, table, snippet }]`.
 * `.from()` com tabela crítica, sem escopo no statement e sem `// rls-allow:`.
 */
export function analyzeSource(source) {
  const rawLines = source.split("\n");
  const code = stripComments(source);
  const masked = maskStrings(code);

  const constants = new Map();
  for (const match of code.matchAll(/\bconst\s+(\w+)\s*(?::[^=]+)?=\s*(["'`])(\w+)\2/g)) {
    constants.set(match[1], match[3]);
  }

  const violations = [];
  const fromCall = /\.from\(\s*(?:(["'`])(\w+)\1|(\w+))\s*(?:as\s+\w+\s*)?,?\s*\)/g;
  for (const match of code.matchAll(fromCall)) {
    if (/\bstorage\s*$/.test(code.slice(Math.max(0, match.index - 20), match.index))) continue;
    const table = match[2] ?? constants.get(match[3]);
    if (!table || !TABLES.includes(table)) continue;

    const lineIndex = code.slice(0, match.index).split("\n").length - 1;
    if (ALLOW_INLINE.test(rawLines[lineIndex] ?? "") || ALLOW_INLINE.test(rawLines[lineIndex - 1] ?? "")) continue;

    const [start, end] = statementBounds(masked, match.index, match[0].length);
    const statement = code.slice(start, end);
    if (SCOPE_SIGNALS.some((signal) => signal.test(statement))) continue;

    violations.push({ line: lineIndex + 1, table, snippet: (rawLines[lineIndex] ?? "").trim() });
  }
  return violations;
}

export function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIR.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SOURCE_FILE.test(entry) && !TEST_FILE.test(entry)) out.push(full);
  }
  return out;
}

export function scan(root) {
  const violations = [];
  for (const file of walk(join(root, "src"))) {
    const rel = relative(root, file).replaceAll("\\", "/");
    if (IGNORE_FILE_PATHS.has(rel)) continue;
    for (const v of analyzeSource(readFileSync(file, "utf8"))) violations.push({ file: rel, ...v });
  }
  return violations;
}

function main() {
  // Raiz do repositório derivada do próprio arquivo: rodar de outro cwd não pode "passar" sem varrer nada.
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  if (!existsSync(join(root, "src"))) {
    console.error(`❌ seller-scope: pasta src/ não encontrada em ${root}.`);
    process.exit(2);
  }
  const violations = scan(root);
  const asJson = process.argv.includes("--json");

  if (asJson) {
    console.log(JSON.stringify({ ok: violations.length === 0, violations }, null, 2));
  } else if (violations.length === 0) {
    console.log("✅ seller-scope check passed — todas as queries para tabelas críticas aplicam seller scope.");
  } else {
    console.error(`❌ seller-scope check falhou — ${violations.length} violação(ões):\n`);
    for (const v of violations) {
      console.error(`  • ${v.file}:${v.line}  [${v.table}]`);
      console.error(`      ${v.snippet}`);
    }
    console.error(
      "\nResolva aplicando uma das opções:\n" +
        "  1) Use applySellerScope(query, { scope, userId }) do src/lib/auth/apply-seller-scope.ts\n" +
        '  2) Adicione .eq("seller_id", userId) explícito\n' +
        "  3) Se a query é legítima sem scope (RPC server-side, admin scope=all),\n" +
        "     anote com // rls-allow: <razão> na linha do .from(...) ou imediatamente acima.\n",
    );
  }

  process.exit(violations.length === 0 ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
