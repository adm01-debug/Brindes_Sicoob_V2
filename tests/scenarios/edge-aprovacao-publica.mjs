import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function app(result) {
  let handler;
  const calls = [];
  const code = ts.transpileModule(readFileSync('supabase/functions/quote-approval/index.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, {
    exports: {}, Response,
    Deno: { env: { get: () => 'configuracao-sintetica' } },
    require: name => {
      if (name.includes('http/server')) return { serve: fn => { handler = fn; } };
      if (name.includes('supabase-js')) return { createClient: () => ({ from: () => assert.fail('Acesso direto fora da transação'), rpc: async (name,args) => { calls.push({ name,args }); return result; } }) };
      if (name.includes('structured-logger')) return { withStructuredLogging: (_name, fn) => fn };
      if (name.includes('rate-limiter')) return { RateLimiter: class {}, applyRateLimit: async () => null };
      if (name.includes('cors')) return { getCorsHeaders: () => ({}), handleCorsPreflightIfNeeded: () => null };
      throw new Error(name);
    },
  });
  return { calls, request: body => handler(new Request('https://simulacao.invalid', { method: 'POST', body: JSON.stringify(body) })) };
}
for (const data of [false,null,{},'true']) {
  test(`adaptador recusa sucesso sem confirmação booleana: ${JSON.stringify(data)}`, async () => {
    const instance=app({data,error:null});
    assert.equal((await instance.request({ action:'respond',token:'sintetico',status:'approved' })).status,409);
  });
}
test('resposta aceita passa por uma única RPC transacional', async () => {
  const instance=app({data:true,error:null});
  assert.equal((await instance.request({ action:'respond',token:'sintetico',status:'approved' })).status,200);
  assert.equal(instance.calls.length,1);
  assert.equal(instance.calls[0].name,'submit_quote_response');
});
test('decisão inválida não vira rejeição silenciosa', async () => {
  const instance=app({data:true,error:null});
  assert.equal((await instance.request({ action:'respond',token:'sintetico',status:'qualquer' })).status,400);
  assert.equal(instance.calls.length,0);
});
test('erro interno não expõe mensagem do banco', async () => {
  const instance=app({data:null,error:{code:'XX000',message:'detalhe-sigiloso'}});
  const response=await instance.request({ action:'get_data',token:'sintetico' });
  assert.equal(response.status,503);
  assert.doesNotMatch(await response.text(),/detalhe-sigiloso/);
});
