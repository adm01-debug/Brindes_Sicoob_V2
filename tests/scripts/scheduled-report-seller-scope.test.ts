import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'supabase/functions/process-scheduled-reports/index.ts'),
  'utf8',
);

describe('escopo de relatórios agendados', () => {
  it.each(['quotes', 'orders'])('filtra %s pelo proprietário do agendamento', (table) => {
    const query = source.match(
      new RegExp(`\\.from\\(["']${table}["']\\)([\\s\\S]*?)\\.limit\\(100\\)`),
    )?.[0];

    expect(query).toBeDefined();
    expect(query).toContain('.eq("seller_id", report.user_id)');
  });
});
