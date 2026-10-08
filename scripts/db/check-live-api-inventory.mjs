#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildApiInventory } from './import-api-inventory.mjs';

const PROJECT_REF = 'cfmzkthhgliqelozlmwu';
const PROJECT_HOST = `${PROJECT_REF}.supabase.co`;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE_PATH = join(ROOT, 'scripts', 'db', '.inventory-cache.json');

function setDifference(left, right) {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => !rightSet.has(value)).sort();
}

export function compareInventorySnapshots(expected, live) {
  const differences = [];
  if (expected.project_ref !== PROJECT_REF || live.project_ref !== PROJECT_REF) {
    differences.push({ kind: 'project_ref', expected: PROJECT_REF, live: live.project_ref });
  }
  for (const kind of ['relations', 'functions', 'buckets']) {
    const missingLive = setDifference(expected[kind] ?? [], live[kind] ?? []);
    const missingCache = setDifference(live[kind] ?? [], expected[kind] ?? []);
    if (missingLive.length || missingCache.length) {
      differences.push({ kind, missing_live: missingLive, missing_cache: missingCache });
    }
  }
  if (expected.contract_sha256 && live.contract_sha256) {
    for (const kind of ['relations', 'functions', 'buckets']) {
      const expectedContracts = expected.contract_sha256[kind] ?? {};
      const liveContracts = live.contract_sha256[kind] ?? {};
      const changed = [
        ...new Set([...Object.keys(expectedContracts), ...Object.keys(liveContracts)]),
      ]
        .filter(
          (name) =>
            expectedContracts[name] !== undefined &&
            liveContracts[name] !== undefined &&
            expectedContracts[name] !== liveContracts[name],
        )
        .sort();
      if (changed.length) {
        differences.push({ kind: 'contract_sha256', contract_kind: kind, changed });
      }
    }
  }
  return differences;
}

async function collectLiveInventory(fetchImpl = globalThis.fetch) {
  const configuredUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!configuredUrl || !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  }
  const url = new URL(configuredUrl);
  if (url.protocol !== 'https:' || url.host !== PROJECT_HOST) {
    throw new Error(`Projeto Supabase inesperado: ${url.host}.`);
  }
  const headers = { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` };
  const [apiResponse, bucketsResponse] = await Promise.all([
    fetchImpl(`${url.origin}/rest/v1/`, {
      headers: { ...headers, accept: 'application/openapi+json' },
    }),
    fetchImpl(`${url.origin}/storage/v1/bucket`, { headers }),
  ]);
  if (!apiResponse.ok) throw new Error(`OpenAPI recusada (HTTP ${apiResponse.status}).`);
  if (!bucketsResponse.ok) throw new Error(`Storage recusado (HTTP ${bucketsResponse.status}).`);
  const [apiText, bucketsText] = await Promise.all([apiResponse.text(), bucketsResponse.text()]);
  const sha256 = (content) => createHash('sha256').update(content).digest('hex');
  return buildApiInventory(JSON.parse(apiText), JSON.parse(bucketsText), new Date().toISOString(), {
    rest_contract: sha256(apiText),
    storage_contract: sha256(bucketsText),
  });
}

async function main() {
  const expected = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  const live = await collectLiveInventory();
  const differences = compareInventorySnapshots(expected, live);
  const result = {
    project_ref: PROJECT_REF,
    captured_at: live.generated_at,
    counts: {
      relations: live.relations.length,
      functions: live.functions.length,
      buckets: live.buckets.length,
    },
    differences,
  };
  console.log(JSON.stringify(result, null, 2));
  if (differences.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[api-inventory] ${error.message}`);
    process.exitCode = 2;
  });
}
