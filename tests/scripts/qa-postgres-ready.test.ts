import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');

/** Roda uma simulação com um daemon Docker inexistente, para exercitar só a regra de "sem Docker". */
function runWithoutDocker(command: string, args: string[], env: Record<string, string>) {
  const clean = { ...process.env } as Record<string, string | undefined>;
  for (const key of ['CI', 'GITHUB_ACTIONS', 'QA_ALLOW_SKIP', 'QA_REQUIRE_DOCKER']) delete clean[key];
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60_000,
    env: { ...clean, DOCKER_HOST: 'unix:///nao-existe/docker.sock', PYTHONDONTWRITEBYTECODE: '1', ...env },
  });
}

const targets: [string, string, string[]][] = [
  ['python (postgres_ready.py)', 'python3', ['scripts/qa/simular-verba-legada.py']],
  ['shell (simular-governanca-orcamento.sh)', 'bash', ['scripts/qa/simular-governanca-orcamento.sh']],
];

describe.each(targets)('simulação QA sem Docker — %s', (_label, command, args) => {
  it('no CI a prova é obrigatória: sai 1 e não finge sucesso', () => {
    for (const env of [{ CI: 'true' }, { GITHUB_ACTIONS: 'true' }, { QA_REQUIRE_DOCKER: '1' }]) {
      const result = runWithoutDocker(command, args, env);
      expect(result.status, `${JSON.stringify(env)}: ${result.stderr}`).toBe(1);
      expect(result.stderr).toContain('NÃO foi executada');
    }
  });

  it('fora do CI pula com aviso e sai 0', () => {
    for (const env of [{}, { CI: 'false' }]) {
      const result = runWithoutDocker(command, args, env);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toContain('nada foi verificado');
    }
  });

  it('QA_ALLOW_SKIP=1 libera o pulo mesmo no CI', () => {
    const result = runWithoutDocker(command, args, { CI: 'true', QA_ALLOW_SKIP: '1' });
    expect(result.status, result.stderr).toBe(0);
  });
});

describe('simulação QA sem o binário docker no PATH', () => {
  it('no CI falha em vez de sair 0', () => {
    const python = spawnSync('bash', ['-c', 'command -v python3'], { encoding: 'utf8' }).stdout.trim();
    const result = spawnSync(python, ['scripts/qa/simular-verba-legada.py'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60_000,
      env: { PATH: '/nao-existe', CI: 'true', PYTHONDONTWRITEBYTECODE: '1' },
    });
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain('Docker não encontrado');
  });
});
