#!/usr/bin/env node
/**
 * check-security-definer-acl
 * --------------------------------------------------------------
 * Gate de CI que falha se alguma função `SECURITY DEFINER` em
 * `public` ficar executável por `PUBLIC`, `anon` (fora da whitelist
 * de funções público-intencionais) ou se uma trigger function ficar
 * acessível a `authenticated`.
 *
 * Por quê:
 *   Funções SECURITY DEFINER rodam com privilégio do owner. Se
 *   `anon`/`PUBLIC` puderem executá-las, abre vetor de privilege-
 *   escalation (lints Supabase 0028 e 0029). A migração de hardening
 *   inicial fechou todas as 257 ocorrências; este script garante que
 *   migrations futuras não reintroduzam o problema.
 *
 * Como funciona:
 *   1. Fora do GitHub Actions, a ausência de credenciais gera skip explícito.
 *      No Actions, a ausência bloqueia o gate para impedir falso positivo.
 *   2. Caso contrário, chama o RPC `audit_security_definer_acl()`
 *      (criado na migração) via REST. Cada linha retornada é uma
 *      violação. Falha com exit 1 e imprime tabela legível.
 *
 * Uso local:
 *   VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/check-security-definer-acl.mjs
 *
 * Uso CI:
 *   - name: SECURITY DEFINER ACL gate
 *     env:
 *       VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
 *       SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
 *     run: node scripts/check-security-definer-acl.mjs
 */

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  const message = "SECURITY DEFINER ACL gate: VITE_SUPABASE_URL/SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.";
  if (process.env.GITHUB_ACTIONS === "true") {
    console.error(`❌ ${message}`);
    console.log(`::error title=SECURITY DEFINER ACL não executado::${message}`);
    process.exit(1);
  }
  console.log(`⚠️  ${message} Execução local ignorada.`);
  process.exit(0);
}

const endpoint = `${url.replace(/\/$/, "")}/rest/v1/rpc/audit_security_definer_acl`;

let res;
try {
  res = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: "{}",
  });
} catch (err) {
  console.error(`❌ Falha de rede ao chamar audit_security_definer_acl: ${err.message}`);
  process.exit(1);
}

if (!res.ok) {
  const text = await res.text();
  console.error(`❌ HTTP ${res.status} ao chamar audit_security_definer_acl:\n${text}`);
  process.exit(1);
}

const rows = await res.json();

if (!Array.isArray(rows)) {
  console.error("❌ Resposta inesperada (esperava array):", rows);
  process.exit(1);
}

if (rows.length === 0) {
  console.log("✅ SECURITY DEFINER ACL: 0 violações.");
  console.log("   Nenhuma violação do contrato ACL auditado; isso não certifica autorização interna ou RLS.");
  process.exit(0);
}

console.error(`\n❌ SECURITY DEFINER ACL: ${rows.length} violação(ões) encontrada(s)\n`);
console.error("Funções SECURITY DEFINER ainda executáveis por papéis indevidos:\n");

const pad = (s, n) => String(s ?? "").padEnd(n);
console.error(
  `  ${pad("FUNÇÃO", 40)} ${pad("ARGS", 30)} ${pad("PAPEL", 14)} PROBLEMA`,
);
console.error(`  ${"-".repeat(40)} ${"-".repeat(30)} ${"-".repeat(14)} ${"-".repeat(50)}`);
for (const r of rows) {
  console.error(
    `  ${pad(r.function_name, 40)} ${pad(r.arguments || "()", 30)} ${pad(r.granted_to, 14)} ${r.problem}`,
  );
}

console.error(
  "\nComo corrigir:\n" +
    "  - Para cada função listada, na próxima migration:\n" +
    "      REVOKE EXECUTE ON FUNCTION public.<fn>(<args>) FROM <papel>;\n" +
    "  - Se a função PRECISA mesmo ser pública (ex: rota de aprovação por\n" +
    "    token), inclua a assinatura completa em uma NOVA migration,\n" +
    "    na lista revisada da função audit_security_definer_acl().\n",
);

// Annotation amigável no GitHub Actions
if (process.env.GITHUB_ACTIONS === "true") {
  console.log(
    `::error title=SECURITY DEFINER ACL gate failed::${rows.length} função(ões) SECURITY DEFINER acessível(eis) por papel indevido. Veja log completo.`,
  );
}

process.exit(1);
