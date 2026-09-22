import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(
  resolve(process.cwd(), `supabase/functions/${name}/index.ts`),
  'utf8',
);

describe('autorização das Edge Functions de seed Sicoob', () => {
  for (const name of ['sicoob-seed', 'sicoob-seed-qa', 'sicoob-seed-debug']) {
    it(`${name} exige papel dev pelo helper compartilhado`, () => {
      const code = source(name);
      expect(code).toContain('from "../_shared/authorize.ts"');
      expect(code).toMatch(/authorize\(req,\s*\{\s*requireRole:\s*"dev",\s*enforceServerSide:\s*true\s*\}\)/);
      expect(code).toMatch(/if \(!auth\.ok\) return log\.respond\(auth\.response\)/);
    });
  }

  it('não mantém senhas previsíveis como fallback no código', () => {
    const primarySeed = source('sicoob-seed');
    const qaSeed = source('sicoob-seed-qa');
    expect(primarySeed).not.toMatch(/SICOOB_TEST_USER_PASSWORD"\)\s*\|\|\s*["']/);
    expect(primarySeed).toContain('test_password_not_configured');
    expect(qaSeed).not.toMatch(/const\s+QA_PASSWORD\s*=\s*["']/);
    expect(qaSeed).toContain('qa_password_not_configured');
  });

  it('diagnóstico não devolve metadados de chaves nem e-mails', () => {
    const code = source('sicoob-seed-debug');
    expect(code).not.toContain('sample_emails');
    expect(code).not.toContain('service_key_ref');
    expect(code).not.toContain('service_key_len');
    expect(code).not.toContain('project_ref_from_url');
  });
});
