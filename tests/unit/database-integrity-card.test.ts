import { describe, expect, it } from 'vitest';
import { resumoAcl, resumoHealth, resumoRls } from '@/components/admin/security/DatabaseIntegrityCard';

describe('resumoRls', () => {
  it('aprova quando todas as tabelas tem RLS e nenhuma e permissiva', () => {
    const r = resumoRls({ score: 100, total: 243, with_rls: 243, missing: [], permissive: [] });
    expect(r.ok).toBe(true);
    expect(r.detail).toBe('243/243 tabelas com RLS — score 100.00%');
  });

  it('reprova listando quantas faltam e quantas sao permissivas', () => {
    const r = resumoRls({ score: 98.5, total: 200, with_rls: 197, missing: ['a', 'b'], permissive: ['c'] });
    expect(r.ok).toBe(false);
    expect(r.detail).toBe('2 sem RLS, 1 permissiva(s) — score 98.50%');
  });

  it('reprova quando so ha permissivas, sem nenhuma tabela sem RLS', () => {
    const r = resumoRls({ score: 99, total: 10, with_rls: 10, missing: [], permissive: ['x'] });
    expect(r.ok).toBe(false);
  });

  it('reprova sem inventario', () => {
    expect(resumoRls(null)).toEqual({ ok: false, detail: 'Sem leitura do inventário' });
  });
});

describe('resumoAcl', () => {
  it('aprova quando o banco nao devolve nenhum achado', () => {
    expect(resumoAcl([]).ok).toBe(true);
  });

  it('reprova e conta os achados', () => {
    const r = resumoAcl([
      { function_name: 'f', arguments: '', problem: 'EXECUTE', granted_to: 'anon' },
      { function_name: 'g', arguments: 'int', problem: 'EXECUTE', granted_to: 'anon' },
    ]);
    expect(r.ok).toBe(false);
    expect(r.detail).toBe('2 função(ões) com permissão indevida');
  });
});

describe('resumoHealth', () => {
  it('aprova apenas SECURE', () => {
    expect(resumoHealth({ last_check: '2026-11-27T11:35:40Z', rls_health: 0, system_status: 'SECURE', recent_admin_changes: 0 }).ok).toBe(true);
    expect(resumoHealth({ last_check: '2026-11-27T11:35:40Z', rls_health: 3, system_status: 'AT_RISK', recent_admin_changes: 2 }).ok).toBe(false);
  });

  it('reprova sem leitura', () => {
    expect(resumoHealth(null).ok).toBe(false);
  });
});
