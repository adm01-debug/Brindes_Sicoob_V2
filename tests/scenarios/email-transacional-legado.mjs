import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function app(authenticated = true) {
  let handler;
  const code = ts.transpileModule(readFileSync('supabase/functions/send-transactional-email/index.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, {
    exports: {}, Response,
    Deno: { env: { get: () => 'configuracao-sintetica' } },
    fetch: () => assert.fail('O endpoint legado não tem transporte de email'),
    require: name => {
      if (name.includes('http/server')) return { serve: fn => { handler=fn; } };
      if (name.includes('cors')) return { getCorsHeaders: () => ({}) };
      if (name.includes('structured-logger')) return { withStructuredLogging: (_name, fn) => fn };
      if (name.includes('supabase-js')) return { createClient: () => ({ auth: { getUser: async () => ({ data:{user:authenticated?{id:'pessoa-sintetica'}:null},error:null }) }, from: () => assert.fail('Notificação interna não equivale a fila de email') }) };
      throw new Error(name);
    },
  });
  return handler;
}
function request() {
  return new Request('https://simulacao.invalid', { method:'POST', headers:{Authorization:'Bearer token-sintetico'}, body:JSON.stringify({event_type:'quote_sent',recipient_email:'qa@example.invalid',data:{quote_number:'SINTETICO',total:100,approval_url:'https://simulacao.invalid/proposta/teste'}}) });
}
test('endpoint legado não anuncia email enfileirado sem fila ou provedor', async () => {
  const response=await app()(request());
  assert.equal(response.status,501);
  assert.equal((await response.json()).success,false);
});
test('email legado continua recusando sessão inválida', async () => {
  assert.equal((await app(false)(request())).status,401);
});
test('endpoint legado recusa método, JSON e evento inválidos sem transporte', async () => {
  const handler=app();
  assert.equal((await handler(new Request('https://simulacao.invalid',{method:'GET',headers:{Authorization:'Bearer token'}}))).status,405);
  assert.equal((await handler(new Request('https://simulacao.invalid',{method:'POST',headers:{Authorization:'Bearer token'},body:'{'}))).status,400);
  const unknown=new Request('https://simulacao.invalid',{method:'POST',headers:{Authorization:'Bearer token'},body:JSON.stringify({event_type:'desconhecido',recipient_email:'qa@example.invalid'})});
  assert.equal((await handler(unknown)).status,422);
});
