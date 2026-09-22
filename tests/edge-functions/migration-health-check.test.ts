import { describe, it, expect } from 'vitest';
import { evaluateMigrationHealth } from '../../supabase/functions/migration-health-check/contract';
describe('health-check de reconciliação', () => {
  const roles = { data: ['gestor_compras','gerente_pa'], error: null };
  const tables = [{ table: 'cooperativas', exists: true }];
  const rls = { data: [{ table_name: 'cooperativas', rls_enabled: true }], error: null };
  it('aceita apenas o conjunto completo validado', () => expect(evaluateMigrationHealth(roles,tables,rls)).toBe(true));
  it('recusa erro RPC, tabela indisponível, resposta vazia e RLS desligado', () => {
    expect(evaluateMigrationHealth({...roles,error:{code:'42501'}},tables,rls)).toBe(false);
    expect(evaluateMigrationHealth(roles,[{...tables[0],exists:false}],rls)).toBe(false);
    expect(evaluateMigrationHealth(roles,tables,{data:[],error:null})).toBe(false);
    expect(evaluateMigrationHealth(roles,tables,{data:[{...rls.data[0],rls_enabled:false}],error:null})).toBe(false);
  });
});
