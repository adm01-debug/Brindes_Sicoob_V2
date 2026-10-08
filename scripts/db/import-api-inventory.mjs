#!/usr/bin/env node
// Importa snapshots obtidos por leitura; não faz requisições nem altera o banco.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
}

function contractHash(value) {
  return createHash('sha256')
    .update(JSON.stringify(stableValue(value)))
    .digest('hex');
}

function bucketContract(bucket) {
  return {
    id: bucket.id,
    name: bucket.name ?? bucket.id,
    public: Boolean(bucket.public),
    type: bucket.type ?? null,
    file_size_limit: bucket.file_size_limit ?? null,
    allowed_mime_types: bucket.allowed_mime_types ?? null,
  };
}

export function buildApiInventory(api, buckets, capturedAt, hashes) {
  if (
    !['cfmzkthhgliqelozlmwu.supabase.co', 'cfmzkthhgliqelozlmwu.supabase.co:443'].includes(api.host)
  ) {
    throw new Error('Projeto inesperado no snapshot.');
  }
  if (
    !api.definitions ||
    !api.paths ||
    !Array.isArray(buckets) ||
    !buckets.every((b) => typeof b.id === 'string')
  ) {
    throw new Error('Contrato ou listagem de buckets inválidos.');
  }
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(capturedAt) || Number.isNaN(Date.parse(capturedAt))) {
    throw new Error('Informe a data real da coleta, sem substituí-la pela data de importação.');
  }
  return {
    _comment:
      'Snapshot do contrato exposto pela Data API administrativa e da listagem de Storage. Não é inventário completo do PostgreSQL. Presença na API não comprova autorização de cada usuário. Atualizar após migrations; não adicionar objetos apenas porque existem no SQL local.',
    generated_at: capturedAt,
    project_ref: 'cfmzkthhgliqelozlmwu',
    source: 'OpenAPI administrativo + Storage; data de coleta informada pelo operador',
    source_sha256: hashes,
    contract_sha256: {
      relations: Object.fromEntries(
        Object.entries(api.definitions)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, definition]) => [name, contractHash(definition)]),
      ),
      functions: Object.fromEntries(
        Object.entries(api.paths)
          .filter(([path]) => path.startsWith('/rpc/'))
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([path, definition]) => [path.slice(5), contractHash(definition)]),
      ),
      buckets: Object.fromEntries(
        buckets
          .map(bucketContract)
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((bucket) => [bucket.id, contractHash(bucket)]),
      ),
    },
    relations: Object.keys(api.definitions).sort(),
    functions: Object.keys(api.paths)
      .filter((p) => p.startsWith('/rpc/'))
      .map((p) => p.slice(5))
      .sort(),
    buckets: [...new Set(buckets.map((b) => b.id))].sort(),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [apiFile, bucketsFile, capturedAt] = process.argv.slice(2);
    if (!apiFile || !bucketsFile || !capturedAt)
      throw new Error(
        'Uso: node scripts/db/import-api-inventory.mjs <openapi.json> <buckets.json> <data-da-coleta>',
      );
    const rawApi = readFileSync(apiFile),
      rawBuckets = readFileSync(bucketsFile);
    const sha = (content) => createHash('sha256').update(content).digest('hex');
    const result = buildApiInventory(JSON.parse(rawApi), JSON.parse(rawBuckets), capturedAt, {
      rest_contract: sha(rawApi),
      storage_contract: sha(rawBuckets),
    });
    writeFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '.inventory-cache.json'),
      JSON.stringify(result, null, 2) + '\n',
    );
    console.log(
      `Inventário importado: ${result.relations.length} relações, ${result.functions.length} RPCs e ${result.buckets.length} buckets.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
