import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = await readFile(
  new URL('../../.github/workflows/e2e.yml', import.meta.url),
  'utf8',
);

assert.doesNotMatch(
  workflow,
  /source_ref/,
  'o workflow não pode aceitar uma ref arbitrária em disparos que recebem segredos',
);
assert.match(workflow, /validate-source:/, 'o workflow deve validar a origem antes do E2E');
assert.match(
  workflow,
  /SOURCE_REF:\s*\$\{\{\s*github\.ref\s*\}\}/,
  'a validação deve ler github.ref',
);
assert.match(workflow, /refs\/heads\/main/, 'o disparo manual deve ficar restrito à main');
assert.match(
  workflow,
  /needs: validate-source/,
  'o job com segredos deve depender da validação de origem',
);
assert.match(
  workflow,
  /max-parallel:\s*1/,
  'os shards autenticados devem ser serializados porque compartilham contas TOTP canônicas',
);

const checkoutRefs = [...workflow.matchAll(/ref:\s*\$\{\{\s*([^}]+)\s*\}\}/g)].map((match) =>
  match[1].trim(),
);
assert.ok(checkoutRefs.length >= 2, 'os checkouts explícitos do workflow devem ser auditáveis');
assert.ok(
  checkoutRefs.every((reference) => reference === 'github.sha'),
  `todos os checkouts devem usar github.sha; encontrados: ${checkoutRefs.join(', ')}`,
);

console.log('✓ Workflow E2E executa somente o SHA imutável de uma origem confiável.');
