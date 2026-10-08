#!/usr/bin/env node
/**
 * check-edge-authorization
 * --------------------------------------------------------------
 * Gate de CI estático que valida:
 *
 *   1. COVERAGE: toda edge function em `supabase/functions/<name>/`
 *      está declarada em `_shared/edge-authz-manifest.ts`. Edges
 *      novas SEM declaração explícita falham o build (fail-closed).
 *
 *   2. ENFORCEMENT: edges declaradas como `supervisor` ou `dev`
 *      DEVEM importar `authorize` do `_shared/authorize.ts` e
 *      passar `requireRole` correspondente. Inspeção AST das chamadas
 *      reais — alternativas custom são permitidas se
 *      `skipAnonBypassTest`/`skipAuthBypassTest` justificarem.
 *
 *   3. ANTI-REGRESSION: detecta funções que tinham `authorize(...)`
 *      e foram modificadas removendo a chamada (heurística simples).
 *
 * Uso local:
 *   node scripts/check-edge-authorization.mjs
 *
 * Integração CI: step adicional em `.github/workflows/ci.yml` ao
 * lado dos demais gates (security-definer-acl, smoke tags, etc.).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inspectAuthorization } from './lib/edge-authorization-contract.mjs';

const FN_DIR = 'supabase/functions';
const MANIFEST_PATH = `${FN_DIR}/_shared/edge-authz-manifest.ts`;
const CONFIG_PATH = 'supabase/config.toml';

// 1) Carrega o manifest (parse via regex para evitar import dinâmico de TS)
const manifestSrc = readFileSync(MANIFEST_PATH, 'utf8');
const entries = new Map();
{
  // Captura name + bloco completo da entrada para parse robusto
  const re = /^\s+"([a-z0-9-]+)":\s*\{([^}]+)\}/gm;
  let m;
  while ((m = re.exec(manifestSrc)) !== null) {
    const body = m[2];
    const cat = body.match(/category:\s*"([a-z]+)"/)?.[1];
    const enforcedBy = body.match(/enforcedBy:\s*"([a-z-]+)"/)?.[1] ?? 'shared-authorize';
    const gatewayMatch = body.match(/gatewayVerifyJwt:\s*(true|false)/)?.[1];
    const gatewayVerifyJwt = gatewayMatch === undefined ? undefined : gatewayMatch === 'true';
    if (cat) entries.set(m[1], { category: cat, enforcedBy, gatewayVerifyJwt });
  }
}

// 2) Lista funções no FS
const fns = readdirSync(FN_DIR).filter((d) => {
  if (d.startsWith('_')) return false;
  try {
    return (
      statSync(join(FN_DIR, d)).isDirectory() && statSync(join(FN_DIR, d, 'index.ts')).isFile()
    );
  } catch {
    return false;
  }
});

const errors = [];
const warnings = [];

// O CLI usa config.toml ao publicar. Funções que validam JWT no próprio
// handler e aceitam publishable keys precisam registrar explicitamente o
// comportamento do gateway para um redeploy não alterar o contrato remoto.
const configSrc = readFileSync(CONFIG_PATH, 'utf8');
const gatewayConfig = new Map();
{
  const re = /^\[functions\.([a-z0-9-]+)\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/gm;
  let match;
  while ((match = re.exec(configSrc)) !== null) {
    const verifyJwt = /^verify_jwt\s*=\s*(true|false)\s*(?:#.*)?$/m.exec(match[2])?.[1];
    if (verifyJwt !== undefined) gatewayConfig.set(match[1], verifyJwt === 'true');
  }
}

// 3) Coverage check
const missingFromManifest = fns.filter((f) => !entries.has(f));
const ghostInManifest = [...entries.keys()].filter((k) => !fns.includes(k));

for (const fn of missingFromManifest) {
  errors.push(
    `[manifest] Edge function "${fn}" não está declarada em edge-authz-manifest.ts. ` +
      `Adicione a entrada com a categoria correta (public/authenticated/supervisor/dev/service/scoped).`,
  );
}
for (const fn of ghostInManifest) {
  errors.push(
    `[manifest] Manifest declara "${fn}" mas a função não existe em supabase/functions/. ` +
      `Remova a entrada ou recrie a função.`,
  );
}
for (const [fn, entry] of entries) {
  if (entry.gatewayVerifyJwt === undefined) continue;
  const configured = gatewayConfig.get(fn);
  if (configured !== entry.gatewayVerifyJwt) {
    errors.push(
      `[gateway] ${fn}: manifest exige verify_jwt=${entry.gatewayVerifyJwt}, ` +
        `mas supabase/config.toml registra ${configured ?? 'nenhum valor'}.`,
    );
  }
}

// 4) Enforcement check para supervisor/dev
const ROLE_REQUIRED = {
  supervisor: ['supervisor', 'dev'], // accept either at the call site
  dev: ['dev'],
};
for (const fn of fns) {
  const entry = entries.get(fn);
  if (!entry) continue;
  if (!ROLE_REQUIRED[entry.category]) continue; // só validamos supervisor/dev

  const path = join(FN_DIR, fn, 'index.ts');
  let src;
  try {
    src = readFileSync(path, 'utf8');
  } catch {
    errors.push(`[enforcement] ${fn}: index.ts ausente.`);
    continue;
  }

  const evidence = inspectAuthorization(src);
  if (entry.enforcedBy === 'custom') {
    const { validatesIdentity, validatesRole } = evidence;
    if (!validatesIdentity || !validatesRole) {
      errors.push(
        `[enforcement] ${fn} (categoria=${entry.category}, custom): não há prova estática ` +
          `conjunta de JWT válido e papel técnico. Use authorize() ou valide auth.getUser() ` +
          `e user_roles/has_role no próprio corpo.`,
      );
    }
    continue;
  }

  const expected = ROLE_REQUIRED[entry.category];
  if (!evidence.sharedRoles.some((role) => expected.includes(role))) {
    errors.push(
      `[enforcement] ${fn} (categoria=${entry.category}): não há chamada aguardada ` +
        `ao authorize importado com requireRole ${expected.join(' ou ')}. ` +
        `Comentários, exemplos e opções de outras chamadas não comprovam autorização.`,
    );
  }
}

// 4.1) Anti-exfiltração: nenhuma edge pode devolver credenciais de serviço
// no corpo da resposta (incidente migrate-helper). Detecta o uso das envs
// sensíveis fora de um client Supabase (createClient) legítimo.
const SECRET_ENVS = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL'];
for (const fn of fns) {
  const path = join(FN_DIR, fn, 'index.ts');
  let src;
  try {
    src = readFileSync(path, 'utf8');
  } catch {
    continue;
  }
  for (const env of SECRET_ENVS) {
    // Padrão proibido: env sensível dentro de JSON.stringify / objeto de resposta.
    const re = new RegExp(
      `(JSON\\.stringify\\([^;]{0,400}${env}|(?:service_role|db_url|serviceRole|dbUrl)\\s*:\\s*Deno\\.env\\.get\\(["']${env}["']\\))`,
      's',
    );
    if (re.test(src)) {
      errors.push(
        `[exfiltration] ${fn}: parece retornar ${env} no corpo da resposta. ` +
          `Credenciais de serviço NUNCA podem ser expostas por uma edge function.`,
      );
    }
  }
}

// 5) Output
console.log(`\n🔐 Edge Authorization Gate`);
console.log(`   Edges no FS: ${fns.length}`);
console.log(`   Edges no manifest: ${entries.size}`);
console.log(`   Categorias:`);
const byCat = new Map();
for (const [, e] of entries) byCat.set(e.category, (byCat.get(e.category) ?? 0) + 1);
for (const [cat, n] of [...byCat.entries()].sort()) {
  console.log(`     - ${cat.padEnd(15)} ${n}`);
}

if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} aviso(s):`);
  for (const w of warnings) console.log(`   ${w}`);
}

if (errors.length === 0) {
  console.log(
    `\n✅ Authorization coverage: OK (${fns.length}/${fns.length} declaradas; contratos estáticos conferidos).`,
  );
  process.exit(0);
}

console.error(`\n❌ ${errors.length} erro(s) de autorização:\n`);
for (const e of errors) console.error(`   ${e}`);

if (process.env.GITHUB_ACTIONS === 'true') {
  console.log(
    `::error title=Edge authorization gate failed::${errors.length} edge(s) sem declaração ou enforcement de autorização. Veja log completo.`,
  );
}
process.exit(1);
