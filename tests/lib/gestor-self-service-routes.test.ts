import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { rolesForSicoobPath } from '@/lib/access/role-policy';

const MENU = 'src/components/layout/SidebarReorganized.tsx';
const SIDEBAR = readFileSync(MENU, 'utf8');
const ALERTAS = readFileSync('src/pages/sicoob/GestorAlertsPage.tsx', 'utf8');
const GUARDA_VERBA = readFileSync(
  'supabase/migrations/20261013115605_harden_sicoob_budget_authority.sql',
  'utf8',
);
const INSERT_VERBA = GUARDA_VERBA.slice(
  GUARDA_VERBA.indexOf('CREATE POLICY pa_budgets_active_scope_insert_guard'),
  GUARDA_VERBA.indexOf('CREATE POLICY pa_budgets_active_scope_update_guard'),
);
const POLITICA_ALERTAS = readFileSync(
  'docs/execucao/auditoria-planejamento-2026-10-13/bd-policies.json',
  'utf8',
);

function itemDoMenu(href: string): string {
  const bloco = SIDEBAR.match(new RegExp(`\\{[^{}]*href: '${href}'[^{}]*\\}`));
  if (!bloco) throw new Error(`Sem item de menu para ${href}`);
  return bloco[0];
}

describe('autoatendimento do gestor da Singular (SIC-017)', () => {
  it.each(['/gestor/verbas', '/gestor/alertas'])('%s tem política de acesso', (caminho) => {
    expect(rolesForSicoobPath(caminho).length).toBeGreaterThan(0);
  });

  it('só libera a tela de verbas a quem o banco aceita alocar', () => {
    expect(INSERT_VERBA).toContain("'gestor_compras'");
    expect(INSERT_VERBA).not.toContain("'comprador_singular'");
    expect(rolesForSicoobPath('/gestor/verbas')).toEqual(['dev', 'supervisor', 'gestor_compras']);
  });

  it('mantém a tela de alertas somente leitura enquanto gravar exigir admin', () => {
    expect(POLITICA_ALERTAS).toContain('sicoob_merged_71fae1b1eedcc5b5_insert');
    const linhaInsert = POLITICA_ALERTAS
      .slice(POLITICA_ALERTAS.indexOf('sicoob_merged_71fae1b1eedcc5b5_insert'))
      .slice(0, 400);
    expect(linhaInsert).toContain("'admin'::app_role");
    expect(ALERTAS).toContain('<NotificationSettingsTab readOnly />');
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
