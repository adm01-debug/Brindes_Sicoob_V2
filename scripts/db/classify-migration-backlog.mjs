#!/usr/bin/env node
/**
 * Classifica migrations locais ausentes do ledger sem executar SQL.
 *
 * O resultado é uma triagem conservadora: presença de objeto no inventário não
 * comprova que a migration foi aplicada, e ausência não autoriza aplicação.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectLocalMigrations } from './check-migration-ledger-drift.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_LEDGER = join(ROOT, 'docs/execucao/evidencias/retomada-mcp-20260922/ledger.json');
const DEFAULT_INVENTORY = join(ROOT, 'scripts/db/.inventory-cache.json');
const sha256 = value => createHash('sha256').update(value).digest('hex');

function unquoteIdentifier(identifier) {
  return identifier.split('.').at(-1)?.replace(/^"|"$/g, '').replace(/""/g, '"').toLowerCase() ?? '';
}

/** Remove comentários, preservando strings e corpos de funções. */
export function stripSqlComments(sql) {
  let result = '';
  let index = 0;
  let quote = null;
  while (index < sql.length) {
    const pair = sql.slice(index, index + 2);
    const char = sql[index];
    if (quote) {
      result += char;
      if (quote === "'" && char === "'" && sql[index + 1] === "'") {
        result += sql[++index];
      } else if (char === quote) {
        quote = null;
      }
      index += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      result += char;
      index += 1;
      continue;
    }
    if (pair === '--') {
      const newline = sql.indexOf('\n', index + 2);
      if (newline < 0) break;
      result += '\n';
      index = newline + 1;
      continue;
    }
    if (pair === '/*') {
      const end = sql.indexOf('*/', index + 2);
      index = end < 0 ? sql.length : end + 2;
      result += ' ';
      continue;
    }
    result += char;
    index += 1;
  }
  return result;
}

function matches(sql, pattern) {
  return pattern.test(sql);
}

function extractNames(sql, pattern) {
  return [...sql.matchAll(pattern)].map(match => unquoteIdentifier(match[1])).filter(Boolean);
}

export function analyzeMigrationSql(sql, inventory = { relations: [], functions: [] }) {
  const code = stripSqlComments(sql);
  const relations = new Set((inventory.relations ?? []).map(value => String(value).toLowerCase()));
  const functions = new Set((inventory.functions ?? []).map(value => String(value).toLowerCase()));
  const createdRelations = extractNames(code, /\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?((?:"?[\w]+"?\.)?"?[\w]+"?)/gi);
  const touchedRelations = extractNames(code, /\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?((?:"?[\w]+"?\.)?"?[\w]+"?)/gi);
  const createdFunctions = extractNames(code, /\bcreate\s+(?:or\s+replace\s+)?function\s+((?:"?[\w]+"?\.)?"?[\w]+"?)/gi);
  const droppedObjects = extractNames(code, /\bdrop\s+(?:table|view|materialized\s+view|function|type|index|policy|trigger)\s+(?:if\s+exists\s+)?((?:"?[\w]+"?\.)?"?[\w]+"?)/gi);

  const flags = [];
  const add = (condition, flag) => { if (condition) flags.push(flag); };
  add(matches(code, /\btruncate\b/i), 'truncate');
  add(matches(code, /\bdelete\s+from\b/i), 'delete_dados');
  add(matches(code, /\bupdate\s+(?:only\s+)?[\w".]+\s+set\b/i), 'update_dados');
  add(matches(code, /\bdrop\s+(?:table|view|materialized\s+view|column|type|function|index)\b/i), 'drop_objeto');
  add(matches(code, /\balter\s+table[\s\S]*?\bdrop\s+(?:column|constraint)\b/i), 'drop_estrutura');
  add(matches(code, /\bdisable\s+row\s+level\s+security\b/i), 'rls_desabilitada');
  add(matches(code, /\busing\s*\(\s*true\s*\)/i), 'policy_using_true');
  add(matches(code, /\bwith\s+check\s*\(\s*true\s*\)/i), 'policy_check_true');
  add(matches(code, /\bgrant\b[\s\S]{0,240}?\bto\s+(?:public|anon)\b/i), 'grant_publico_ou_anon');
  add(matches(code, /\bsecurity\s+definer\b/i) && !matches(code, /\bset\s+search_path\s*(?:=|to)\s*/i), 'security_definer_sem_search_path_explicito');
  add(matches(code, /\b(?:products|product_images|product_variants|stock_daily_summary|tecnicas_gravacao)\b/i), 'referencia_catalogo_externo');
  add(matches(code, /\b(?:cron\.schedule|net\.http_|create\s+extension|storage\.(?:buckets|objects))\b/i), 'infraestrutura_ou_storage');
  add(matches(code, /\b(?:insert\s+into|copy\s+)\b/i), 'carga_de_dados');

  const existingObjects = [
    ...createdRelations.filter(name => relations.has(name)).map(name => ({ type: 'relation', name })),
    ...createdFunctions.filter(name => functions.has(name)).map(name => ({ type: 'function', name })),
  ];
  const missingCreatedObjects = [
    ...createdRelations.filter(name => !relations.has(name)).map(name => ({ type: 'relation', name })),
    ...createdFunctions.filter(name => !functions.has(name)).map(name => ({ type: 'function', name })),
  ];
  const missingTouchedRelations = touchedRelations.filter(name => !relations.has(name));

  const destructive = flags.some(flag => ['truncate', 'delete_dados', 'drop_objeto', 'drop_estrutura', 'rls_desabilitada'].includes(flag));
  const securityReview = flags.some(flag => ['policy_using_true', 'policy_check_true', 'grant_publico_ou_anon', 'security_definer_sem_search_path_explicito'].includes(flag));
  const dependencyGap = missingTouchedRelations.length > 0;
  let disposition = 'candidata_dry_run_dependencias';
  if (destructive) disposition = 'bloquear_aplicacao_automatica';
  else if (securityReview || flags.some(flag => [
    'referencia_catalogo_externo', 'update_dados', 'carga_de_dados', 'infraestrutura_ou_storage',
  ].includes(flag))) disposition = 'revisao_manual_prioritaria';
  else if (dependencyGap) disposition = 'bloqueada_por_dependencia_ausente';
  else if (existingObjects.length && missingCreatedObjects.length === 0) disposition = 'possivelmente_aplicada_fora_ledger';

  return {
    disposition,
    flags: [...new Set(flags)].sort(),
    objects: {
      created_relations: [...new Set(createdRelations)].sort(),
      touched_relations: [...new Set(touchedRelations)].sort(),
      created_functions: [...new Set(createdFunctions)].sort(),
      dropped: [...new Set(droppedObjects)].sort(),
      existing: existingObjects,
      missing_created: missingCreatedObjects,
      missing_touched_relations: [...new Set(missingTouchedRelations)].sort(),
    },
  };
}

export function classifyBacklog({ root = ROOT, ledger, inventory }) {
  if (!Array.isArray(ledger.local_versions_not_in_ledger)) throw new Error('Evidência do ledger sem local_versions_not_in_ledger.');
  const pending = new Set(ledger.local_versions_not_in_ledger.map(String));
  const files = collectLocalMigrations(root).filter(file => !file.archived && pending.has(file.version));
  const items = files.map(file => {
    const absolutePath = join(root, file.path);
    const sql = readFileSync(absolutePath, 'utf8');
    return { version: file.version, path: file.path, sha256: sha256(sql), ...analyzeMigrationSql(sql, inventory) };
  }).sort((a, b) => a.version.localeCompare(b.version));
  const dispositionCounts = Object.fromEntries([...new Set(items.map(item => item.disposition))].sort().map(key => [key, items.filter(item => item.disposition === key).length]));
  const flagCounts = Object.fromEntries([...new Set(items.flatMap(item => item.flags))].sort().map(key => [key, items.filter(item => item.flags.includes(key)).length]));
  return {
    generated_from: { ledger_date: ledger.date, project_ref: ledger.project_ref, inventory_generated_at: inventory.generated_at },
    source_hashes: { ledger_canonical_json_sha256: sha256(JSON.stringify(ledger)), inventory_canonical_json_sha256: sha256(JSON.stringify(inventory)) },
    scope: { pending_versions: pending.size, classified_files: items.length },
    disposition_counts: dispositionCounts,
    flag_counts: flagCounts,
    caveats: [
      'Triagem estática não comprova equivalência entre o SQL local e o objeto remoto.',
      'Objeto existente pode ter sido criado fora do ledger ou por outra migration.',
      'Candidata a dry-run ainda exige ordem de dependências, revisão humana e rollback.',
      'Nenhum item desta saída autoriza aplicação ou reparo automático do ledger.',
    ],
    items,
  };
}

export function renderMarkdownSummary(result, jsonPath = 'migration-backlog-classification.json') {
  const lines = [
    '# Classificação do backlog de migrations',
    '',
    `Projeto \`${result.generated_from.project_ref}\`; evidência de ledger de ${result.generated_from.ledger_date}.`,
    '',
    `Esta classificação é estática e conservadora. Ela organiza a revisão; não autoriza aplicar SQL nem reparar o ledger. O inventário completo, com hash e objetos por arquivo, está em [\`${jsonPath.split('/').at(-1)}\`](${jsonPath.split('/').at(-1)}).`,
    '',
    '## Cobertura',
    '',
    `- Versões locais fora do ledger: **${result.scope.pending_versions}**.`,
    `- Arquivos classificados: **${result.scope.classified_files}**.`,
    '',
    '| Disposição | Quantidade |',
    '|---|---:|',
    ...Object.entries(result.disposition_counts).map(([name, count]) => `| \`${name}\` | ${count} |`),
    '',
    '## Sinais encontrados',
    '',
    '| Sinal | Arquivos |',
    '|---|---:|',
    ...Object.entries(result.flag_counts).map(([name, count]) => `| \`${name}\` | ${count} |`),
    '',
    '## Bloqueios de aplicação automática',
    '',
    '| Versão | Arquivo | Sinais |',
    '|---|---|---|',
    ...result.items.filter(item => item.disposition === 'bloquear_aplicacao_automatica')
      .map(item => `| ${item.version} | \`${item.path}\` | ${item.flags.map(flag => `\`${flag}\``).join(', ')} |`),
    '',
    '## Dependências ausentes no inventário',
    '',
    '| Versão | Arquivo | Relações ausentes |',
    '|---|---|---|',
    ...result.items.filter(item => item.disposition === 'bloqueada_por_dependencia_ausente')
      .map(item => `| ${item.version} | \`${item.path}\` | ${item.objects.missing_touched_relations.map(name => `\`${name}\``).join(', ')} |`),
    '',
    '## Limites obrigatórios',
    '',
    ...result.caveats.map(item => `- ${item}`),
    '',
  ];
  return lines.join('\n');
}

function valueAfter(args, flag, fallback) {
  const index = args.indexOf(flag);
  return index < 0 ? fallback : resolve(args[index + 1]);
}

async function main() {
  const args = process.argv.slice(2);
  const ledgerPath = valueAfter(args, '--ledger', DEFAULT_LEDGER);
  const inventoryPath = valueAfter(args, '--inventory', DEFAULT_INVENTORY);
  const outputPath = valueAfter(args, '--output', null);
  const markdownPath = valueAfter(args, '--markdown', null);
  const result = classifyBacklog({
    ledger: JSON.parse(readFileSync(ledgerPath, 'utf8')),
    inventory: JSON.parse(readFileSync(inventoryPath, 'utf8')),
  });
  const serialized = JSON.stringify(result, null, 2) + '\n';
  if (outputPath) writeFileSync(outputPath, serialized);
  else process.stdout.write(serialized);
  if (markdownPath) writeFileSync(markdownPath, renderMarkdownSummary(result, outputPath ?? 'migration-backlog-classification.json'));
  if (result.scope.classified_files !== result.scope.pending_versions) {
    throw new Error(`Cobertura incompleta: ${result.scope.classified_files}/${result.scope.pending_versions}.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(`[classificador] ${error.message}`); process.exitCode = 1; });
}
