import { readFile } from "node:fs/promises";

export const REQUIRED_EDGE_FUNCTIONS = [
  "expert-chat",
  "external-db-bridge",
  "sicoob-approval-reconciliation",
  "sicoob-artwork-register",
  "sicoob-document-ingest",
  "sicoob-kit-quote",
  "sicoob-reorder",
];

function parseVersion(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1
    ? value
    : null;
}

function toFunctionMap(payload) {
  const functions = Array.isArray(payload) ? payload : payload?.functions;
  if (!Array.isArray(functions)) return null;
  const result = new Map();
  for (const fn of functions) {
    if (!fn || typeof fn.slug !== "string" || !fn.slug.trim() || result.has(fn.slug)) return null;
    result.set(fn.slug, fn);
  }
  return result;
}

export function verifyEdgeFunctionDeployments(beforePayload, currentPayload) {
  const before = toFunctionMap(beforePayload);
  const current = toFunctionMap(currentPayload);
  if (!before || !current) return { ok: false, errors: ["Formato JSON da lista de funções inválido."] };

  const errors = [];
  const confirmations = [];

  for (const slug of REQUIRED_EDGE_FUNCTIONS) {
    if (!before.has(slug)) {
      errors.push(`${slug} não consta no inventário anterior completo.`);
    }
  }

  if (errors.length > 0) return { ok: false, errors, confirmations };

  for (const slug of REQUIRED_EDGE_FUNCTIONS) {
    const deployed = current.get(slug);
    if (!deployed) {
      errors.push(`${slug} não consta na lista remota.`);
      continue;
    }
    if (deployed.status !== "ACTIVE") {
      errors.push(`${slug} não está ACTIVE.`);
      continue;
    }

    const currentVersion = parseVersion(deployed.version);
    if (currentVersion === null) {
      errors.push(`${slug} tem versão remota inválida.`);
      continue;
    }

    const previous = before.get(slug);
    const previousVersion = parseVersion(previous.version);
    if (previousVersion === null) {
      errors.push(`${slug} tinha versão anterior inválida.`);
      continue;
    }
    if (currentVersion < previousVersion) {
      errors.push(`${slug} regrediu da versão ${previousVersion} para ${currentVersion}.`);
      continue;
    }

    confirmations.push(previousVersion === currentVersion
      ? `${slug}: sem alteração de bundle (v${currentVersion}), função ativa.`
      : `${slug}: versão ${currentVersion} ativa.`);
  }

  return { ok: errors.length === 0, errors, confirmations };
}

async function main() {
  const [beforePath, currentPath] = process.argv.slice(2);
  if (!beforePath || !currentPath) {
    console.error("Uso: node scripts/verify-edge-function-deploy.mjs <antes.json> <depois.json>");
    process.exitCode = 2;
    return;
  }

  try {
    const before = JSON.parse(await readFile(beforePath, "utf8"));
    const current = JSON.parse(await readFile(currentPath, "utf8"));
    const result = verifyEdgeFunctionDeployments(before, current);
    for (const confirmation of result.confirmations) console.log(`✓ ${confirmation}`);
    for (const error of result.errors) console.error(`::error title=Publicação não confirmada::${error}`);
    if (!result.ok) process.exitCode = 1;
  } catch {
    console.error("::error title=Publicação não confirmada::Não foi possível ler as respostas JSON do Supabase CLI.");
    process.exitCode = 1;
  }
}

if (import.meta.main) await main();
