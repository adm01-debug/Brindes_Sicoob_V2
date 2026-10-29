import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function readFunctionList(payload, label) {
  const records = Array.isArray(payload) ? payload : payload?.functions;
  if (!Array.isArray(records)) {
    throw new Error(`${label}: formato de lista de funções inválido.`);
  }

  const bySlug = new Map();
  for (const record of records) {
    if (typeof record?.slug !== 'string' || record.slug.length === 0) continue;
    if (bySlug.has(record.slug)) {
      throw new Error(`${label}: função duplicada na lista: ${record.slug}.`);
    }
    bySlug.set(record.slug, record.version);
  }
  return bySlug;
}

function readVersion(value, functionName, label) {
  if (!(typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)))) {
    throw new Error(`${label}: versão inválida para ${functionName}.`);
  }
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new Error(`${label}: versão fora do intervalo válido para ${functionName}.`);
  }
  return version;
}

export function verifyFunctionDeploy({ before, after, unchangedByCli, expectedFunctions }) {
  const previous = readFunctionList(before, 'Lista anterior');
  const current = readFunctionList(after, 'Lista publicada');
  const unchanged = new Set(unchangedByCli);
  const checked = [];

  for (const functionName of expectedFunctions) {
    if (!previous.has(functionName) || !current.has(functionName)) {
      throw new Error(`Função ausente na confirmação: ${functionName}.`);
    }

    const previousVersion = readVersion(previous.get(functionName), functionName, 'Lista anterior');
    const currentVersion = readVersion(current.get(functionName), functionName, 'Lista publicada');
    if (currentVersion < previousVersion) {
      throw new Error(
        `${functionName}: versão publicada regrediu de ${previousVersion} para ${currentVersion}.`,
      );
    }
    if (currentVersion === previousVersion && !unchanged.has(functionName)) {
      throw new Error(
        `${functionName}: versão permaneceu em ${currentVersion} sem confirmação nominal de “No change found” pela CLI.`,
      );
    }

    checked.push({
      functionName,
      previousVersion,
      currentVersion,
      unchanged: currentVersion === previousVersion,
    });
  }

  return checked;
}

async function main() {
  const [beforePath, afterPath, unchangedPath, expectedPath] = process.argv.slice(2);
  if (!beforePath || !afterPath || !unchangedPath || !expectedPath) {
    throw new Error(
      'Uso: node scripts/verify-supabase-function-deploy.mjs <anterior.json> <publicada.json> <sem-alteracao.txt> <esperadas.txt>',
    );
  }

  const [beforeText, afterText, unchangedText, expectedText] = await Promise.all([
    readFile(beforePath, 'utf8'),
    readFile(afterPath, 'utf8'),
    readFile(unchangedPath, 'utf8'),
    readFile(expectedPath, 'utf8'),
  ]);
  const checked = verifyFunctionDeploy({
    before: JSON.parse(beforeText),
    after: JSON.parse(afterText),
    unchangedByCli: unchangedText.split(/\r?\n/).filter(Boolean),
    expectedFunctions: expectedText.split(/\r?\n/).filter(Boolean),
  });

  for (const entry of checked) {
    const status = entry.unchanged
      ? 'sem alteração confirmada pela CLI'
      : `versão ${entry.currentVersion}`;
    console.log(`${entry.functionName}: ${status}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
