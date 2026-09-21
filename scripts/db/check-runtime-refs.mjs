#!/usr/bin/env node
/**
 * check-runtime-refs.mjs
 *
 * Varre src/**\/*.{ts,tsx} e supabase/functions/**\/*.ts procurando
 * `.from()`, `.rpc()` e `.storage.from()` chamados no client interno
 * (`@/integrations/supabase/client` / import relativo equivalente) e
 * confere cada identificador contra o inventário ao vivo do banco.
 *
 * Por quê existe: a Etapa 26 do plano principal (docs/plano-implementacao/
 * plano-reconciliacao-50-etapas.md) fez essa varredura manualmente numa
 * amostra e deixou ~318 nomes de fora; a auditoria tripla de 17/09/2026
 * (docs/plano-implementacao/plano-correcoes-auditoria-50-etapas-20260917.md,
 * Etapa 19) fechou a amostra completa manualmente e pediu este script pra
 * a próxima regressão não depender de auditoria manual de novo.
 *
 * Como funciona:
 *  1. Lê scripts/db/.inventory-cache.json (tabelas/views/funções/buckets
 *     ao vivo) — gerado por consulta MCP read-only, NÃO chamado daqui.
 *     PRECISA SER REGENERADO PERIODICAMENTE (ver Etapa 47 do plano de
 *     correções de 17/09/2026 — ainda não agendado). Um cache desatualizado
 *     produz falso-negativo (objeto que já foi dropado ainda "existe" pro
 *     script) ou falso-positivo (objeto criado depois do cache aparece
 *     como quebrado) — trate a idade do cache como parte do resultado.
 *  2. Para cada arquivo, identifica o identificador do client interno
 *     (import de .../integrations/supabase/client) e quaisquer variáveis
 *     de 1 nível de indireção que apontem pra `<client>.rpc`/`.from`/
 *     `.storage.from` (ex.: `const xRpc = supabase.rpc as ...`).
 *  3. Ignora chamadas em identificadores que claramente são clients
 *     externos (nome contém external/ext/crm, criados via `createClient(`
 *     no mesmo arquivo) — essas não são validadas aqui, são catálogo
 *     externo/CRM, fora do escopo deste banco.
 *  4. Reporta cada referência do client interno sem objeto correspondente
 *     no cache, com arquivo:linha. Sai com código 1 se sobrar algo fora
 *     da allowlist (scripts/db/.check-runtime-refs-allowlist.json).
 *
 * Uso: node scripts/db/check-runtime-refs.mjs [--json]
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const SCAN_DIRS = [join(ROOT, 'src'), join(ROOT, 'supabase', 'functions')];
const FILE_EXT = /\.(ts|tsx)$/;
const IGNORE_DIR = new Set(['node_modules', '.git', 'dist', 'build', '__generated__']);

const INTERNAL_CLIENT_IMPORT_RE =
  /import\s*\{\s*([A-Za-z_$][\w$]*)\s*(?:as\s+([A-Za-z_$][\w$]*))?\s*\}\s*from\s*['"][^'"]*integrations\/supabase\/client['"]/;

const EXTERNAL_NAME_HINT_RE = /external|extclient|crmclient|crm_db/i;

// Aceita quebra de linha/espaço entre o método e o argumento — o gap que
// escondeu o bucket `personalization` quebrado em 2 linhas na auditoria original.
const CALL_RE =
  /([A-Za-z_$][\w$]*(?:\.storage)?)\s*\.\s*(from|rpc)\s*\(\s*['"]([\w.-]+)['"]/gs;

const INDIRECTION_RE =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*\.\s*(rpc|from)\b/g;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (IGNORE_DIR.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (FILE_EXT.test(entry)) out.push(full);
  }
  return out;
}

function loadJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`[check-runtime-refs] aviso: não consegui ler ${path}: ${err.message}`);
    return fallback;
  }
}

// Funções edge (Deno) não importam de @/integrations/supabase/client — criam
// o client via createClient(url, key) lendo Deno.env.get(...). Resolvemos por
// nome de variável de ambiente: SUPABASE_URL/SERVICE_ROLE_KEY/ANON_KEY (sem
// prefixo EXTERNAL_/CRM_) apontam pro banco interno; EXTERNAL_*/CRM_* não.
const ENV_VAR_ASSIGN_RE = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*Deno\.env\.get\(\s*['"]([A-Z0-9_]+)['"]\s*\)/g;
const CREATE_CLIENT_ASSIGN_RE = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*createClient\s*\(\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)/g;
const RETURN_CREATE_CLIENT_RE = /function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::[^{]+)?\{[^}]*?return\s+createClient\s*\(\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)/gs;
const CALL_WRAPPER_RE = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*\(/g;

function isInternalEnvName(name) {
  return /^SUPABASE_(URL|SERVICE_ROLE_KEY|ANON_KEY|PUBLISHABLE_KEY)$/.test(name);
}
function isExternalEnvName(name) {
  return /^(EXTERNAL|CRM)_/.test(name);
}

function analyzeFile(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const findings = [];

  const importMatch = INTERNAL_CLIENT_IMPORT_RE.exec(text);
  const isEdgeFunctionStyle = !importMatch && /Deno\.env\.get/.test(text) && /createClient\s*\(/.test(text);
  if (!importMatch && !isEdgeFunctionStyle) return findings; // arquivo não fala com nenhum client Supabase

  const internalName = importMatch ? importMatch[2] || importMatch[1] : null;

  // Nota: NÃO tratamos "toda `const X = createClient(...)`" como externa por
  // padrão — em supabase/functions isso também é como o client INTERNO é
  // criado (createClient(SUPABASE_URL, SERVICE_ROLE_KEY)). A classificação
  // externo/interno correta é feita abaixo, por nome de env var. Aqui só
  // aplicamos a heurística de nome de variável (funciona em src/, onde o
  // client externo normalmente já chega pronto de um helper, sem createClient
  // local para inspecionar).
  const externalVars = new Set();
  for (const m of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    if (EXTERNAL_NAME_HINT_RE.test(m[1])) externalVars.add(m[1]);
  }

  const indirectRpcVars = new Set(internalName ? [internalName] : []);
  const indirectFromVars = new Set(internalName ? [internalName] : []);

  // --- Resolução de client interno em estilo Deno edge function ---
  if (isEdgeFunctionStyle) {
    const envMap = new Map(); // varName -> ENV_VAR_NAME
    for (const m of text.matchAll(ENV_VAR_ASSIGN_RE)) envMap.set(m[1], m[2]);

    const wrapperFnNames = new Set();
    for (const m of text.matchAll(CREATE_CLIENT_ASSIGN_RE)) {
      const [, clientVar, urlVar, keyVar] = m;
      const urlEnv = envMap.get(urlVar);
      const keyEnv = envMap.get(keyVar);
      if ((urlEnv && isExternalEnvName(urlEnv)) || (keyEnv && isExternalEnvName(keyEnv))) {
        externalVars.add(clientVar);
      } else if ((urlEnv && isInternalEnvName(urlEnv)) || (keyEnv && isInternalEnvName(keyEnv))) {
        indirectFromVars.add(clientVar);
        indirectRpcVars.add(clientVar);
      }
    }
    for (const m of text.matchAll(RETURN_CREATE_CLIENT_RE)) {
      const [, fnName, urlVar, keyVar] = m;
      const urlEnv = envMap.get(urlVar);
      const keyEnv = envMap.get(keyVar);
      if ((urlEnv && isInternalEnvName(urlEnv)) || (keyEnv && isInternalEnvName(keyEnv))) {
        wrapperFnNames.add(fnName);
      }
    }
    if (wrapperFnNames.size) {
      for (const m of text.matchAll(CALL_WRAPPER_RE)) {
        const [, assignedVar, calledFn] = m;
        if (wrapperFnNames.has(calledFn)) {
          indirectFromVars.add(assignedVar);
          indirectRpcVars.add(assignedVar);
        }
      }
    }
  }

  // Indireção de 1 nível, forma `const xRpc = supabase.rpc` -> `xRpc(...)`.
  let indMatch;
  const indRe = new RegExp(INDIRECTION_RE.source, 'g');
  const directCallVars = new Set(); // vars chamadas diretamente como função (não .rpc())
  while ((indMatch = indRe.exec(text))) {
    const [, aliasVar, baseVar, kind] = indMatch;
    const baseIsInternal = baseVar === internalName || indirectRpcVars.has(baseVar) || indirectFromVars.has(baseVar);
    if (!baseIsInternal) continue;
    if (kind === 'rpc') directCallVars.add(aliasVar);
    else {
      indirectFromVars.add(aliasVar);
    }
  }
  // `const xRpc = supabase.rpc as ...` é chamado como `xRpc('nome', ...)`, não `xRpc.rpc('nome')`.
  for (const varName of directCallVars) {
    const directRe = new RegExp(`\\b${varName}\\s*\\(\\s*['"]([\\w.-]+)['"]`, 'g');
    let dm;
    while ((dm = directRe.exec(text))) {
      const upto = text.slice(0, dm.index);
      findings.push({ file: relative(ROOT, filePath), line: upto.split('\n').length, kind: 'rpc', name: dm[1] });
    }
  }

  const lines = text.split('\n');
  const callRe = new RegExp(CALL_RE.source, CALL_RE.flags);
  let m;
  let iter = 0;
  while ((m = callRe.exec(text))) {
    iter++;
    if (iter > 5000) break; // guarda contra regex patológica em arquivo gigante
    const [full, baseExpr, method, name] = m;
    const baseIdMatch = baseExpr.match(/^([A-Za-z_$][\w$]*)/);
    const baseId = baseIdMatch ? baseIdMatch[1] : baseExpr;

    if (externalVars.has(baseId)) continue; // client externo, fora de escopo

    const isStorage = baseExpr.includes('.storage');
    const isInternal =
      baseId === internalName ||
      (method === 'rpc' && indirectRpcVars.has(baseId)) ||
      (method === 'from' && !isStorage && indirectFromVars.has(baseId)) ||
      (isStorage && (baseId === internalName || indirectFromVars.has(baseId)));

    if (!isInternal) continue; // identificador não resolvido -> não afirma nada (evita falso-positivo)

    const upto = text.slice(0, m.index);
    const line = upto.split('\n').length;

    findings.push({
      file: relative(ROOT, filePath),
      line,
      kind: isStorage ? 'storage' : method,
      name,
    });
  }

  return findings;
}

function main() {
  const jsonOutput = process.argv.includes('--json');

  const cache = loadJson(join(__dirname, '.inventory-cache.json'), null);
  if (!cache) {
    console.error(
      '[check-runtime-refs] scripts/db/.inventory-cache.json ausente ou inválido — regenere via MCP antes de rodar (Etapa 47 do plano de correções).'
    );
    process.exit(2);
  }
  const allowlistDoc = loadJson(join(__dirname, '.check-runtime-refs-allowlist.json'), { entries: {} });
  const allowlist = new Set(Object.keys(allowlistDoc.entries || {}));

  const tables = new Set(cache.tables || []);
  const views = new Set(cache.views || []);
  const functions = new Set(cache.functions || []);
  const buckets = new Set(cache.buckets || []);
  const tableLike = new Set([...tables, ...views]);

  const files = SCAN_DIRS.flatMap((d) => walk(d));
  const allFindings = files.flatMap(analyzeFile);

  const broken = [];
  for (const f of allFindings) {
    let exists;
    if (f.kind === 'storage') exists = buckets.has(f.name);
    else if (f.kind === 'rpc') exists = functions.has(f.name);
    else exists = tableLike.has(f.name);

    if (!exists) broken.push(f);
  }

  const blocking = broken.filter((f) => !allowlist.has(f.name));
  const allowed = broken.filter((f) => allowlist.has(f.name));

  if (jsonOutput) {
    console.log(JSON.stringify({ cache_generated_at: cache.generated_at, broken, blocking, allowed }, null, 2));
  } else {
    console.log(
      `[check-runtime-refs] cache de ${cache.generated_at} · ${files.length} arquivos varridos · ${allFindings.length} referências ao client interno encontradas`
    );
    if (allowed.length) {
      console.log(`\n${allowed.length} referência(s) quebrada(s) mas na allowlist (ver .check-runtime-refs-allowlist.json):`);
      for (const f of allowed) console.log(`  ${f.file}:${f.line}  ${f.kind}('${f.name}')`);
    }
    if (blocking.length) {
      console.log(`\n${blocking.length} referência(s) SEM objeto correspondente e FORA da allowlist:`);
      for (const f of blocking) console.log(`  ${f.file}:${f.line}  ${f.kind}('${f.name}')`);
    } else {
      console.log('\n0 referências quebradas fora da allowlist.');
    }
  }

  process.exit(blocking.length > 0 ? 1 : 0);
}

main();
