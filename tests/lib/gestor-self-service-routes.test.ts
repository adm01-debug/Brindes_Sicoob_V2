import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { rolesForSicoobPath } from '@/lib/access/role-policy';

const MENU = 'src/components/layout/SidebarReorganized.tsx';
const SIDEBAR = readFileSync(MENU, 'utf8');

function itemDoMenu(href: string): string {
  const bloco = SIDEBAR.match(new RegExp(`\\{[^{}]*href: '${href}'[^{}]*\\}`));
  if (!bloco) throw new Error(`Sem item de menu para ${href}`);
  return bloco[0];
}

describe('autoatendimento do gestor da Singular (SIC-017)', () => {
  it.each(['/gestor/verbas', '/gestor/alertas'])('%s tem política de acesso', (caminho) => {
    expect(rolesForSicoobPath(caminho).length).toBeGreaterThan(0);
  });

  it('o menu mostra cada rota exatamente aos papéis que a política libera', () => {
    for (const caminho of ['/gestor/verbas', '/gestor/alertas']) {
      const item = itemDoMenu(caminho);
      for (const papel of rolesForSicoobPath(caminho)) {
        expect(item, `${caminho} → ${papel}`).toContain(`'${papel}'`);
      }
      expect(item).not.toContain('gerente_pa');
    }
  });
});
