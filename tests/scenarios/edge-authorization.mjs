import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Executa o módulo real; somente transporte e ambiente são substituídos.
function carregarAutorizador(papeis) {
  const fonte = fs.readFileSync('supabase/functions/_shared/authorize.ts', 'utf8');
  const codigo = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const cliente = {
    auth: { getUser: async () => ({ data: { user: { id: 'usuario-sintetico' } }, error: null }) },
    from: () => ({ select: () => ({ eq: async () => ({ data: papeis.map(role => ({ role })), error: null }) }) }),
    rpc: async () => ({ data: false, error: null }),
  };
  const exports = {};
  const contexto = {
    exports, Request, Response, console,
    Deno: { env: { get: () => 'configuracao-sintetica' } },
    require: (nome) => {
      if (nome.includes('supabase-js')) return { createClient: () => cliente };
      if (nome === './cors.ts') return { getCorsHeaders: () => ({}) };
      throw new Error(`Dependência não simulada: ${nome}`);
    },
  };
  vm.runInNewContext(codigo, contexto, { filename: 'authorize.ts' });
  return exports.authorize;
}

const papeisBasicos = ['comprador_pac', 'comprador_singular', 'gestor_compras', 'gerente_pa', 'vendedor', 'agente'];
for (const papel of papeisBasicos) {
  for (const exigido of ['dev', 'supervisor']) {
    test(`${papel} não recebe privilégio técnico de ${exigido}`, async () => {
      const resultado = await carregarAutorizador([papel])(new Request('https://simulacao.invalid', { headers: { Authorization: 'Bearer token-sintetico' } }), { requireRole: exigido });
      assert.equal(resultado.ok, false);
      assert.equal(resultado.response.status, 403);
    });
  }
  test(`${papel} mantém acesso autenticado básico`, async () => {
    const resultado = await carregarAutorizador([papel])(new Request('https://simulacao.invalid', { headers: { Authorization: 'Bearer token-sintetico' } }), { requireRole: 'agente' });
    assert.equal(resultado.ok, true);
  });
}
for (const papeis of [[], ['desconhecido'], ['desconhecido','comprador_pac'], ['comprador_pac','desconhecido']]) {
  test(`papéis inválidos não contornam autorização: ${JSON.stringify(papeis)}`, async () => {
    const resultado = await carregarAutorizador(papeis)(new Request('https://simulacao.invalid', { headers: { Authorization: 'Bearer token-sintetico' } }), { requireRole: 'dev' });
    assert.equal(resultado.ok, false);
  });
}
for (const papeis of [['dev'], ['comprador_pac','dev'], ['dev','comprador_pac']]) {
  test(`papel técnico explícito funciona independentemente da ordem: ${JSON.stringify(papeis)}`, async () => {
    const resultado = await carregarAutorizador(papeis)(new Request('https://simulacao.invalid', { headers: { Authorization: 'Bearer token-sintetico' } }), { requireRole: 'dev' });
    assert.equal(resultado.ok, true);
  });
}
test('requisição sem sessão é recusada antes de consultar o banco', async () => {
  const resultado = await carregarAutorizador(['dev'])(new Request('https://simulacao.invalid'), { requireRole: 'dev' });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.response.status, 401);
});
