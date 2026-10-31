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

function getFunction(functions, slug, label, { optional = false } = {}) {
  const matches = functions.filter((fn) => fn?.slug === slug);
  if (matches.length === 0 && optional) return null;
  if (matches.length !== 1) {
    throw new Error(
      `Resposta ${label} deve conter exatamente uma entrada para ${slug}; encontradas: ${matches.length}.`,
    );
  }
  return matches[0];
}

function getVersion(fn) {
  const rawVersion = fn?.version;
  if (
    typeof rawVersion !== 'number' &&
    !(typeof rawVersion === 'string' && /^[1-9]\d*$/.test(rawVersion))
  ) {
    return null;
  }
  const version = Number(rawVersion);
  return Number.isSafeInteger(version) && version > 0 ? version : null;
}

export function verifyPublishedFunctions(beforePayload, afterPayload) {
  const before = getFunctions(beforePayload, 'anterior');
  const after = getFunctions(afterPayload, 'atual');

  for (const slug of requiredFunctions) {
    const previous = getFunction(before, slug, 'anterior', { optional: true });
    const previousVersion = previous ? getVersion(previous) : 0;
    if (previous && previousVersion === null) {
      throw new Error(`Versão anterior inválida para ${slug}; não é seguro comparar a publicação.`);
    }

    const current = getFunction(after, slug, 'atual');
    const currentVersion = getVersion(current);
    if (current.status !== 'ACTIVE') {
      throw new Error(
        `Publicação não confirmada para ${slug}: status atual ${current.status ?? 'ausente'}, esperado ACTIVE.`,
      );
    }
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
  console.log(
    `✅ ${requiredFunctions.length} funções listadas como ACTIVE, com versões válidas e sem regressão. ` +
      'A listagem confirma metadados, não o hash do bundle servido.',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`::error title=Publicação não confirmada::${error.message}`);
    process.exitCode = 1;
  });
}
