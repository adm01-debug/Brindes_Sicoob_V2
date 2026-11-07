/**
 * Contrato compartilhado de CLI para os scripts de automação.
 *
 * Centraliza o que cada script vinha reimplementando (ou esquecendo):
 *   - parsing de flags com defaults e rejeição de flag desconhecida;
 *   - `--help` padronizado (exit 0) e erro de uso (exit 2);
 *   - exit codes estáveis: 0 = sucesso, 1 = falha de verificação, 2 = uso inválido;
 *   - anotações `::error`/`::warning` quando roda no GitHub Actions;
 *   - mensagens em pt-BR com prefixo do script.
 *
 * Sem dependências externas: só `node:process`.
 */

export const EXIT_OK = 0;
export const EXIT_FAIL = 1;
export const EXIT_USAGE = 2;

export function isGithubActions() {
  return process.env.GITHUB_ACTIONS === 'true';
}

/** Anotação nativa do GitHub Actions; no-op fora do CI. */
export function annotate(level, message, file) {
  if (!isGithubActions()) return;
  const safe = String(message).replace(/\r?\n/g, '%0A');
  const suffix = file ? ` file=${file}` : '';
  process.stdout.write(`::${level}${suffix}::${safe}\n`);
}

export function createLogger(name) {
  const prefix = `[${name}]`;
  return {
    info: (msg) => console.log(`${prefix} ${msg}`),
    warn: (msg) => {
      console.warn(`${prefix} ${msg}`);
      annotate('warning', msg);
    },
    error: (msg, file) => {
      console.error(`${prefix} ${msg}`);
      annotate('error', msg, file);
    },
  };
}

/**
 * Parser de flags minimalista e previsível.
 *
 * spec: { flagName: { type: 'boolean'|'string', default, alias, description } }
 * Aceita `--flag`, `--flag=valor` e `--flag valor`. `--no-flag` desliga booleanos.
 * Lança UsageError em flag desconhecida ou valor ausente.
 */
export class UsageError extends Error {}

export function parseArgs(argv, spec = {}) {
  const byAlias = new Map();
  for (const [name, def] of Object.entries(spec)) {
    if (def.alias) byAlias.set(def.alias, name);
  }

  const values = {};
  for (const [name, def] of Object.entries(spec)) {
    values[name] = def.type === 'boolean' ? Boolean(def.default) : def.default;
  }

  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    const isLong = token.startsWith('--');
    const isShort = !isLong && token.startsWith('-') && token.length > 1;
    if (!isLong && !isShort) {
      positional.push(token);
      continue;
    }

    const negated = isLong && token.startsWith('--no-');
    const raw = negated ? token.slice(5) : token.slice(isLong ? 2 : 1);
    const eq = raw.indexOf('=');
    const key = eq === -1 ? raw : raw.slice(0, eq);
    const inlineValue = eq === -1 ? undefined : raw.slice(eq + 1);
    const name = spec[key] ? key : byAlias.get(key);

    if (!name) throw new UsageError(`Flag desconhecida: ${token}`);

    const def = spec[name];
    if (def.type === 'boolean') {
      if (inlineValue !== undefined) {
        values[name] = !['0', 'false', 'no'].includes(inlineValue.toLowerCase());
      } else {
        values[name] = !negated;
      }
      continue;
    }

    if (negated) throw new UsageError(`Flag ${key} não aceita a forma --no-${key}`);
    if (inlineValue !== undefined) {
      values[name] = inlineValue;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('-')) {
      throw new UsageError(`Flag ${isLong ? '--' : '-'}${key} exige um valor`);
    }
    values[name] = next;
    i += 1;
  }

  return { values, positional };
}

export function formatHelp({ name, summary, usage, spec = {}, examples = [] }) {
  const lines = [`${name} — ${summary}`, '', 'Uso:', `  ${usage}`, ''];
  const entries = Object.entries(spec);
  if (entries.length > 0) {
    lines.push('Opções:');
    for (const [flag, def] of entries) {
      const alias = def.alias ? `-${def.alias}, ` : '    ';
      const value = def.type === 'boolean' ? '' : ` <${def.type}>`;
      const fallback =
        def.default === undefined || def.default === false
          ? ''
          : ` (padrão: ${def.default})`;
      lines.push(`  ${alias}--${flag}${value}`.padEnd(34) + `${def.description ?? ''}${fallback}`);
    }
    lines.push('');
  }
  lines.push('  -h, --help'.padEnd(34) + 'Mostra esta ajuda e sai com código 0.');
  if (examples.length > 0) {
    lines.push('', 'Exemplos:');
    for (const example of examples) lines.push(`  ${example}`);
  }
  return lines.join('\n');
}

/**
 * Executa o corpo do script com tratamento uniforme de erro e exit code.
 *
 * `main` recebe `{ values, positional, log }` e pode retornar:
 *   - `undefined`/`0` → sucesso;
 *   - número → usado como exit code;
 *   - `{ exitCode, message }` → mensagem final + exit code.
 */
export async function runCli(meta, main) {
  const { name, spec = {} } = meta;
  const log = createLogger(name);
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(formatHelp(meta));
    process.exitCode = EXIT_OK;
    return EXIT_OK;
  }

  let parsed;
  try {
    parsed = parseArgs(argv, spec);
  } catch (error) {
    if (error instanceof UsageError) {
      log.error(error.message);
      console.error(`\n${formatHelp(meta)}`);
      process.exitCode = EXIT_USAGE;
      return EXIT_USAGE;
    }
    throw error;
  }

  let exitCode;
  try {
    const result = await main({ ...parsed, log, argv });
    if (typeof result === 'number') {
      exitCode = result;
    } else if (result && typeof result === 'object') {
      exitCode = result.exitCode ?? EXIT_OK;
      if (result.message) (exitCode === EXIT_OK ? log.info : log.error)(result.message);
    } else {
      exitCode = EXIT_OK;
    }
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error));
    if (process.env.DEBUG) console.error(error);
    exitCode = EXIT_FAIL;
  }

  process.exitCode = exitCode;
  return exitCode;
}
