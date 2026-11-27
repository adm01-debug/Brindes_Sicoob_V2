import { describe, expect, it } from 'vitest';
import { avisoDeCobertura, resumoAcl, resumoHealth, resumoRls } from '@/components/admin/security/DatabaseIntegrityCard';

const auditoria = {
  tables_total: 243,
  tables_with_rls: 243,
  tables_missing_rls: [] as string[],
  tables_permissive_rls: [] as string[],
  score: 100,
  audited_at: '2026-11-27T11:35:42Z',
};

const saude = { last_check: '2026-11-27T11:35:40Z', rls_health: 0, system_status: 'SECURE', recent_admin_changes: 0 };

describe('resumoRls', () => {
  it('aprova quando todas as tabelas tem RLS e nenhuma e permissiva', () => {
    const r = resumoRls(auditoria);
    expect(r.ok).toBe(true);
    expect(r.detail).toBe('243/243 tabelas com RLS — score 100.00%');
  });

  it('reprova listando quantas faltam e quantas sao permissivas', () => {
    const r = resumoRls({ ...auditoria, tables_total: 200, tables_with_rls: 197, tables_missing_rls: ['a', 'b'], tables_permissive_rls: ['c'], score: 98.5 });
    expect(r.ok).toBe(false);
    expect(r.detail).toBe('2 sem RLS, 1 permissiva(s) — score 98.50%');
  });

  it('reprova quando so ha permissivas, sem nenhuma tabela sem RLS', () => {
    expect(resumoRls({ ...auditoria, tables_permissive_rls: ['x'] }).ok).toBe(false);
  });

  it('reprova, em vez de aprovar, quando nao existe auditoria registrada', () => {
    expect(resumoRls(null)).toEqual({ ok: false, detail: 'Nenhuma auditoria de RLS registrada' });
  });
});

describe('resumoAcl', () => {
  it('aprova quando o banco nao devolve nenhum achado', () => {
    expect(resumoAcl([], false).ok).toBe(true);
  });

  it('reprova e conta os achados', () => {
    const r = resumoAcl([
      { function_name: 'f', arguments: '', problem: 'EXECUTE', granted_to: 'anon' },
      { function_name: 'g', arguments: 'int', problem: 'EXECUTE', granted_to: 'anon' },
    ], false);
    expect(r.ok).toBe(false);
    expect(r.detail).toBe('2 função(ões) com permissão indevida');
  });

  it('nao afirma ausencia de achados quando a leitura falhou', () => {
    expect(resumoAcl([], true)).toEqual({ ok: false, detail: 'Não foi possível ler as permissões' });
  });
});

describe('resumoHealth', () => {
  it('nao confia no system_status fixo: deriva dos achados', () => {
    expect(resumoHealth(saude, false).ok).toBe(true);
    expect(resumoHealth(saude, true)).toEqual({
      ok: false,
      detail: 'Achados de integridade abertos — 0 alteração(ões) de admin nas últimas 24h',
    });
  });

  it('reprova sem leitura', () => {
    expect(resumoHealth(null, false).ok).toBe(false);
  });
});

describe('avisoDeCobertura', () => {
  it('avisa quando parte do total nao aparece como verificada', () => {
    const aviso = avisoDeCobertura({ ...auditoria, tables_total: 244, tables_with_rls: 243, score: 99.59 });
    expect(aviso).toContain('1 tabela(s) do total não aparecem como verificadas');
  });

  it('nao avisa quando nao ha divergencia', () => {
    expect(avisoDeCobertura(auditoria)).toBeNull();
  });
});
