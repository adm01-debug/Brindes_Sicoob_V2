import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');

/**
 * A queda de registry do Postgres descartável é lógica pura e roda sem Docker:
 * o teste Python usa dublês de `docker run` e de `sleep`. Aqui ele entra no CI.
 */
describe('scripts/qa — queda para o espelho quando o registry estoura a cota', () => {
  it('a suíte Python de start_supabase_postgres passa', () => {
    const resultado = spawnSync('python3', ['tests/scripts/qa/test_start_supabase_postgres.py'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60_000,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    });

    expect(resultado.stderr + resultado.stdout).toContain('OK');
    expect(resultado.status).toBe(0);
  }, 70_000);
});
