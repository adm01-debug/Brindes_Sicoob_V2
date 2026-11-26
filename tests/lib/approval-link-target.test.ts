import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { canAccessSicoobPath, rolesForSicoobPath } from '@/lib/access/role-policy';

const AVISO = 'supabase/functions/_shared/approval-delivery.ts';

function caminhoDoAviso(): string {
  const fonte = readFileSync(AVISO, 'utf8');
  const match = fonte.match(/APPROVER_QUEUE_PATH = '([^']+)'/);
  if (!match) throw new Error('APPROVER_QUEUE_PATH não encontrado no aviso de alçada');
  return match[1];
}

describe('link do aviso de alçada', () => {
  it('abre a fila de aprovações da Singular', () => {
    expect(caminhoDoAviso()).toBe('/gestor/aprovacoes');
  });

  it('cai numa rota que os aprovadores podem acessar', () => {
    const caminho = caminhoDoAviso();
    expect(rolesForSicoobPath(caminho).length).toBeGreaterThan(0);
    for (const papel of ['gestor_compras', 'gerente_pa', 'comprador_singular', 'comprador_pac', 'supervisor']) {
      expect(canAccessSicoobPath(caminho, [papel]), papel).toBe(true);
    }
  });

  it('não cai na área administrativa, que fica fora da política de rotas do Sicoob', () => {
    expect(rolesForSicoobPath('/admin/sicoob')).toEqual([]);
    expect(caminhoDoAviso().startsWith('/admin/')).toBe(false);
  });
});
