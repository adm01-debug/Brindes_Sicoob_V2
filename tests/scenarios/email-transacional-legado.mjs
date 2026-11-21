import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function app({ authenticated = true, configured = false, providerId = 'email-sintetico' } = {}) {
  let handler;
  const code = ts.transpileModule(readFileSync('supabase/functions/send-transactional-email/index.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, {
    exports: {}, Response,
    Deno: { env: { get: () => configured ? 'configuracao-sintetica' : undefined } },
    fetch: configured
      ? async () => new Response(JSON.stringify({ id: providerId }), { status: 200 })
      : () => assert.fail('Sem secrets o transporte degrada antes de chamar o provedor'),
    require: name => {
      if (name.includes('http/server')) return { serve: fn => { handler=fn; } };
      if (name.includes('cors')) return { getCorsHeaders: () => ({}) };
      if (name.includes('structured-logger')) return { withStructuredLogging: (_name, fn) => fn };
      if (name.includes('./deliver.ts')) return { deliverTransactionalEmail: async () => configured
        ? { accepted: true, providerId }
        : { accepted: false, errorCode: 'email_not_configured' } };
      if (name.includes('./templates.ts')) return { renderTemplate: (eventType) => eventType === 'desconhecido' ? null : { subject: 'Assunto sintetico', html: '<p>corpo</p>' } };
      if (name.includes('supabase-js')) return { createClient: () => ({ auth: { getUser: async () => ({ data:{user:authenticated?{id:'pessoa-sintetica'}:null},error:null }) }, from: () => assert.fail('Notificação interna não equivale a fila de email') }) };
      throw new Error(name);
    },
  });
  return handler;
}
function request() {
  return new Request('https://simulacao.invalid', { method:'POST', headers:{Authorization:'Bearer token-sintetico'}, body:JSON.stringify({event_type:'quote_sent',recipient_email:'qa@example.invalid',data:{quote_number:'SINTETICO',total:100,approval_url:'https://simulacao.invalid/proposta/teste'}}) });
}
test('endpoint degrada com recibo estruturado sem provedor configurado', async () => {
  const response=await app()(request());
  assert.equal(response.status,503);
  const body=await response.json();
  assert.equal(body.success,false);
  assert.equal(body.error,'email_not_configured');
  assert.equal(body.delivered,false);
});

test('endpoint confirma entrega com recibo do provedor', async () => {
  const response=await app({ configured: true })(request());
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.success,true);
  assert.equal(body.delivery_status,'accepted');
  assert.equal(body.provider_id,'email-sintetico');
});
test('email legado continua recusando sessão inválida', async () => {
  assert.equal((await app({ authenticated: false })(request())).status,401);
});
test('endpoint legado recusa método, JSON e evento inválidos sem transporte', async () => {
  const handler=app();
  assert.equal((await handler(new Request('https://simulacao.invalid',{method:'GET',headers:{Authorization:'Bearer token'}}))).status,405);
  assert.equal((await handler(new Request('https://simulacao.invalid',{method:'POST',headers:{Authorization:'Bearer token'},body:'{'}))).status,400);
  const unknown=new Request('https://simulacao.invalid',{method:'POST',headers:{Authorization:'Bearer token'},body:JSON.stringify({event_type:'desconhecido',recipient_email:'qa@example.invalid'})});
  assert.equal((await handler(unknown)).status,422);
});
