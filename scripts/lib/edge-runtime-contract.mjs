import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const EDGE_FUNCTIONS_DIR = 'supabase/functions';
export const EDGE_AUTHZ_MANIFEST_PATH = `${EDGE_FUNCTIONS_DIR}/_shared/edge-authz-manifest.ts`;

export function readLocalEdgeFunctions(root = process.cwd()) {
  const functionsDir = join(root, EDGE_FUNCTIONS_DIR);
  return readdirSync(functionsDir)
    .filter((name) => {
      if (name.startsWith('_')) return false;
      try {
        return (
          statSync(join(functionsDir, name)).isDirectory() &&
          statSync(join(functionsDir, name, 'index.ts')).isFile()
        );
      } catch {
        return false;
      }
    })
    .sort();
}

export function parseEdgeRuntimeContract(source) {
  const entryPattern = /^\s{2}"([a-z0-9-]+)":\s*\{/gm;
  const matches = [...source.matchAll(entryPattern)];
  const objectEnd = source.lastIndexOf('\n};');
  const entries = new Map();

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const name = current[1];
    const start = current.index ?? 0;
    const end = next?.index ?? objectEnd;
    const body = source.slice(start, end);
    const category = body.match(/category:\s*"([a-z]+)"/)?.[1];
    if (!category) throw new Error(`Categoria ausente no manifesto para ${name}.`);

    const runtime = body.match(/runtime:\s*"(deployed|source-only)"/)?.[1] ?? 'deployed';
    const gatewayMatch = body.match(/gatewayVerifyJwt:\s*(true|false)/)?.[1];
    entries.set(name, {
      category,
      runtime,
      gatewayVerifyJwt: gatewayMatch === 'true',
    });
  }

  return entries;
}

export function readEdgeRuntimeContract(root = process.cwd()) {
  const source = readFileSync(join(root, EDGE_AUTHZ_MANIFEST_PATH), 'utf8');
  return parseEdgeRuntimeContract(source);
}

export function validateEdgeRuntimeContract(root = process.cwd()) {
  const localFunctions = readLocalEdgeFunctions(root);
  const contract = readEdgeRuntimeContract(root);
  const errors = [];

  for (const name of localFunctions) {
    if (!contract.has(name)) errors.push(`Função local sem contrato: ${name}`);
  }
  for (const name of contract.keys()) {
    if (!localFunctions.includes(name)) errors.push(`Contrato sem função local: ${name}`);
  }

  const deployed = [...contract]
    .filter(([, entry]) => entry.runtime === 'deployed')
    .map(([name, entry]) => ({ name, verifyJwt: entry.gatewayVerifyJwt }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const sourceOnly = [...contract]
    .filter(([, entry]) => entry.runtime === 'source-only')
    .map(([name]) => name)
    .sort();

  if (deployed.length > 100) {
    errors.push(`O contrato tenta publicar ${deployed.length} funções; o limite atual é 100.`);
  }

  return { contract, deployed, sourceOnly, localFunctions, errors };
}
