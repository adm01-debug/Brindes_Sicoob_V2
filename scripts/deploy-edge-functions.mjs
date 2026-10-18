#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateEdgeRuntimeContract } from './lib/edge-runtime-contract.mjs';

function readOption(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    const details = options.capture ? `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() : '';
    throw new Error(`${command} ${args.join(' ')} falhou${details ? `: ${details}` : '.'}`);
  }
  return options.capture ? result.stdout : '';
}

function listRemote(projectRef) {
  const output = run(
    'supabase',
    ['functions', 'list', '--project-ref', projectRef, '--output', 'json'],
    { capture: true },
  );
  const parsed = JSON.parse(output);
  if (!Array.isArray(parsed)) throw new Error('Inventário remoto retornou um formato inesperado.');
  return new Map(parsed.map((entry) => [entry.slug, entry]));
}

function assertRemoteContract(remote, deployed, sourceOnly, phase) {
  const errors = [];
  const expected = new Map(deployed.map((entry) => [entry.name, entry]));
  for (const entry of deployed) {
    const actual = remote.get(entry.name);
    if (!actual) {
      errors.push(`${entry.name}: ausente no runtime`);
      continue;
    }
    if (actual.status !== 'ACTIVE') errors.push(`${entry.name}: status ${actual.status}`);
    if (actual.verify_jwt !== entry.verifyJwt) {
      errors.push(`${entry.name}: verify_jwt=${actual.verify_jwt}; contrato=${entry.verifyJwt}`);
    }
  }
  for (const name of sourceOnly) {
    if (remote.has(name)) errors.push(`${name}: source-only está publicada`);
  }
  for (const name of remote.keys()) {
    if (!expected.has(name)) errors.push(`${name}: publicada sem contrato deployed`);
  }
  if (errors.length) throw new Error(`Divergência ${phase}:\n- ${errors.join('\n- ')}`);
}

function assertNoUnmanagedRemote(remote, deployed, sourceOnly) {
  const expected = new Set(deployed.map((entry) => entry.name));
  const blocked = new Set(sourceOnly);
  const errors = [];
  for (const name of remote.keys()) {
    if (blocked.has(name)) errors.push(`${name}: source-only está publicada`);
    else if (!expected.has(name)) errors.push(`${name}: publicada sem contrato deployed`);
  }
  if (errors.length)
    throw new Error(`Runtime contém funções não gerenciadas:\n- ${errors.join('\n- ')}`);
}

function writeReport(reportPath, data) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(
    reportPath,
    `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), ...data }, null, 2)}\n`,
  );
}

const deploy = process.argv.includes('--deploy');
const verifyLive = process.argv.includes('--verify-live');
const confirmation = readOption('--confirm');
const projectRef = readOption('--project-ref') ?? process.env.SUPABASE_PROJECT_ID;
const reportPath = resolve(readOption('--report') ?? 'artifacts/edge-deployment-report.json');
const { deployed, sourceOnly, localFunctions, errors } = validateEdgeRuntimeContract();

if (errors.length) throw new Error(`Contrato local inválido:\n- ${errors.join('\n- ')}`);
if (deployed.length !== 100 || sourceOnly.length !== 6 || localFunctions.length !== 106) {
  throw new Error(
    `Inventário inesperado: ${localFunctions.length} fontes, ${deployed.length} deployed, ` +
      `${sourceOnly.length} source-only. Revise explicitamente o limite antes de publicar.`,
  );
}

console.log(
  `Contrato Edge válido: ${localFunctions.length} fontes, ${deployed.length} publicáveis e ` +
    `${sourceOnly.length} somente-fonte.`,
);

if (!deploy && !verifyLive) process.exit(0);
if (!projectRef) throw new Error('Informe --project-ref ou SUPABASE_PROJECT_ID.');

const before = listRemote(projectRef);
if (verifyLive && !deploy) {
  assertRemoteContract(before, deployed, sourceOnly, 'no runtime atual');
  console.log('Runtime remoto corresponde ao contrato versionado.');
  process.exit(0);
}

if (confirmation !== 'PUBLICAR') throw new Error('A publicação exige --confirm PUBLICAR.');
assertNoUnmanagedRemote(before, deployed, sourceOnly);

const completed = [];
writeReport(reportPath, {
  status: 'iniciada',
  projectRef,
  totals: {
    local: localFunctions.length,
    deployed: deployed.length,
    sourceOnly: sourceOnly.length,
  },
  sourceOnly,
  completed,
});

try {
  for (const [index, entry] of deployed.entries()) {
    console.log(`[${index + 1}/${deployed.length}] Publicando ${entry.name}...`);
    const args = ['functions', 'deploy', entry.name, '--project-ref', projectRef];
    if (!entry.verifyJwt) args.push('--no-verify-jwt');
    run('supabase', args);
    completed.push(entry.name);
    writeReport(reportPath, {
      status: 'em_andamento',
      projectRef,
      totals: {
        local: localFunctions.length,
        deployed: deployed.length,
        sourceOnly: sourceOnly.length,
      },
      sourceOnly,
      completed,
    });
  }
} catch (error) {
  writeReport(reportPath, {
    status: 'falhou',
    projectRef,
    totals: {
      local: localFunctions.length,
      deployed: deployed.length,
      sourceOnly: sourceOnly.length,
    },
    sourceOnly,
    completed,
    error: error instanceof Error ? error.message : String(error),
  });
  throw error;
}

const after = listRemote(projectRef);
assertRemoteContract(after, deployed, sourceOnly, 'depois da publicação');
const unchangedVersions = [];
for (const { name } of deployed) {
  const previous = Number(before.get(name)?.version ?? 0);
  const current = Number(after.get(name)?.version ?? 0);
  if (!Number.isInteger(current) || current <= previous) {
    unchangedVersions.push(`${name}: ${previous} -> ${current}`);
  }
}
if (unchangedVersions.length) {
  throw new Error(`Versões sem avanço após deploy:\n- ${unchangedVersions.join('\n- ')}`);
}

const report = {
  status: 'concluida',
  projectRef,
  totals: {
    local: localFunctions.length,
    deployed: deployed.length,
    sourceOnly: sourceOnly.length,
  },
  sourceOnly,
  functions: deployed.map(({ name, verifyJwt }) => ({
    name,
    verifyJwt,
    previousVersion: Number(before.get(name)?.version ?? 0),
    currentVersion: Number(after.get(name)?.version ?? 0),
  })),
};
writeReport(reportPath, report);
console.log(`Publicação reconciliada. Evidência: ${reportPath}`);
