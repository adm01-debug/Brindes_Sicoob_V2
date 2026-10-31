import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const requiredFunctions = [
  'expert-chat',
  'external-db-bridge',
  'sicoob-approval-reconciliation',
  'sicoob-artwork-register',
  'sicoob-document-ingest',
  'sicoob-kit-quote',
  'sicoob-reorder',
];

function getFunctions(payload, label) {
  const functions = Array.isArray(payload) ? payload : payload?.functions;
  if (!Array.isArray(functions)) {
    throw new Error(`Resposta ${label} não contém uma lista de funções.`);
  }
  return functions;
}

function getVersion(functions, slug) {
  const found = functions.find((fn) => fn?.slug === slug);
  if (!found) return null;
  const version = Number(found.version);
  return Number.isSafeInteger(version) && version > 0 ? version : null;
}

export function verifyPublishedFunctions(beforePayload, afterPayload) {
  const before = getFunctions(beforePayload, 'anterior');
  const after = getFunctions(afterPayload, 'atual');

  for (const slug of requiredFunctions) {
    const previousVersion = getVersion(before, slug) ?? 0;
    const currentVersion = getVersion(after, slug);
    if (currentVersion === null || currentVersion < previousVersion) {
      throw new Error(
        `Publicação não confirmada para ${slug}: versão atual ${currentVersion ?? 'ausente/inválida'} (anterior: ${previousVersion}).`,
      );
    }
  }
}

async function main() {
  const [beforePath, afterPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) {
    throw new Error('Uso: node verify-supabase-functions-published.mjs <antes.json> <depois.json>');
  }
  const beforePayload = JSON.parse(await readFile(beforePath, 'utf8'));
  const afterPayload = JSON.parse(await readFile(afterPath, 'utf8'));
  verifyPublishedFunctions(beforePayload, afterPayload);
  console.log(`✅ ${requiredFunctions.length} funções presentes com versões válidas, sem regressão.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`::error title=Publicação não confirmada::${error.message}`);
    process.exitCode = 1;
  });
}
