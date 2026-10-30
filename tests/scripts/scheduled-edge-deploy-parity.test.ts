import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationDir = join(root, 'supabase/migrations');
const workflowPath = join(root, '.github/workflows/deploy-sicoob-functions.yml');

function cronManagedEdgeFunctions(): Set<string> {
  const functions = new Set<string>();
  for (const file of readdirSync(migrationDir)) {
    if (!file.endsWith('.sql')) continue;
    const source = readFileSync(join(migrationDir, file), 'utf8');
    if (!source.includes('dispatch_sicoob_')) continue;
    for (const match of source.matchAll(/\/functions\/v1\/([a-z0-9-]+)/gi)) {
      functions.add(match[1]);
    }
  }
  return functions;
}

function deploymentLists(workflow: string): Set<string>[] {
  return [...workflow.matchAll(/for function_name in \\\n([\s\S]*?)\n\s*do/g)].map(([, block]) => new Set(
    block.split('\n')
      .map((line) => line.trim().replace(/\\$/, '').trim())
      .filter((entry) => /^[a-z][a-z0-9-]*$/.test(entry)),
  ));
}

describe('paridade entre os workers cron Sicoob e o workflow de publicação', () => {
  it('inclui cada Edge Function chamada por workers cron nas listas de deploy e confirmação', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    const cronFunctions = cronManagedEdgeFunctions();
    const lists = deploymentLists(workflow);

    expect(cronFunctions.size).toBeGreaterThan(0);
    expect(lists).toHaveLength(2);
    for (const functionName of cronFunctions) {
      expect(existsSync(join(root, 'supabase/functions', functionName, 'index.ts'))).toBe(true);
      for (const list of lists) expect(list.has(functionName), `${functionName} ausente na lista`).toBe(true);
    }
  });
});
