import { describe, expect, it } from 'vitest';
import { auditoriaVencida, avisoDeCobertura, resumoAcl, resumoHealth, resumoRls, statusDeIntegridade } from '@/components/admin/security/DatabaseIntegrityCard';

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
    expect(resumoRls(null)).toEqual({ ok: false, detail: 'Nenhuma auditoria de RLS registrada', achado: false });
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

const AGORA = new Date('2026-11-27T12:00:00Z');

describe('auditoriaVencida', () => {
  it('vence quando o dado passa de 7 dias', () => {
    expect(auditoriaVencida({ ...auditoria, audited_at: '2026-11-01T00:00:00Z' }, AGORA)).toBe(true);
    expect(auditoriaVencida({ ...auditoria, audited_at: '2026-11-26T00:00:00Z' }, AGORA)).toBe(false);
  });

  it('vence sem data legivel', () => {
    expect(auditoriaVencida({ ...auditoria, audited_at: 'data-invalida' }, AGORA)).toBe(true);
    expect(auditoriaVencida(null, AGORA)).toBe(true);
  });
});

describe('resumoRls com dado vencido', () => {
  it('nao da selo verde quando a auditoria esta velha, mesmo sem achados', () => {
    const r = resumoRls({ ...auditoria, audited_at: '2026-11-01T00:00:00Z' }, AGORA);
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('o dado está desatualizado');
  });

  it('mantem a aprovacao com dado recente', () => {
    expect(resumoRls({ ...auditoria, audited_at: '2026-11-26T00:00:00Z' }, AGORA).ok).toBe(true);
  });
});

describe('statusDeIntegridade', () => {
  const base = { rls: auditoria, health: saude, aclFindings: [] as never[], errors: [] as string[], carregadoEm: AGORA.toISOString() };

  it('APROVA so quando tudo foi lido e nada tem achado', () => {
    expect(statusDeIntegridade(base, AGORA)).toBe('OK');
  });

  it('marca PARCIAL quando alguma leitura falhou, em vez de aprovar', () => {
    expect(statusDeIntegridade({ ...base, errors: ['Permissões de função: boom'] }, AGORA)).toBe('PARCIAL');
  });

  it('marca ATENCAO quando ha achado, mesmo com leitura parcial', () => {
    expect(statusDeIntegridade({ ...base, errors: ['x'], aclFindings: [{ function_name: 'f', arguments: '', problem: 'EXECUTE', granted_to: 'anon' }] }, AGORA)).toBe('ATENCAO');
  });

  it('auditoria vencida sem achado nao vira ATENCAO: nao ha problema confirmado', () => {
    const velha = { ...base, rls: { ...auditoria, audited_at: '2026-11-01T00:00:00Z' } };
    expect(statusDeIntegridade(velha, AGORA)).toBe('OK');
    expect(resumoRls(velha.rls, AGORA).ok).toBe(false);
    expect(resumoRls(velha.rls, AGORA).achado).toBe(false);
  });

  it('auditoria vencida nao mascara achado real de RLS', () => {
    const velhaComFuro = { ...base, rls: { ...auditoria, audited_at: '2026-11-01T00:00:00Z', tables_missing_rls: ['t'] } };
    expect(statusDeIntegridade(velhaComFuro, AGORA)).toBe('ATENCAO');
  });
});
