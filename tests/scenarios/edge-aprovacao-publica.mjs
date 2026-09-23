import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';

function app(targetResult, rateResult = { data: { allowed: true }, error: null }) {
  let handler;
  const calls = [];
  const code = ts.transpileModule(readFileSync('supabase/functions/quote-approval/index.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, {
    exports: {}, Response, Request, TextEncoder, crypto: webcrypto,
    Deno: { env: { get: () => 'configuracao-sintetica' } },
    require: name => {
      if (name.includes('http/server')) return { serve: fn => { handler = fn; } };
      if (name.includes('supabase-js')) return { createClient: () => ({
        from: () => assert.fail('Acesso direto fora da transação'),
        rpc: async (name,args) => {
          calls.push({ name,args });
          return name === 'check_rate_limit' ? rateResult : targetResult;
        },
      }) };
      if (name.includes('structured-logger')) return { withStructuredLogging: (_name, fn) => fn };
      if (name.includes('rate-limiter')) return { RateLimiter: class {}, applyRateLimit: async () => null };
      if (name.includes('cors')) return { getCorsHeaders: () => ({}), handleCorsPreflightIfNeeded: () => null };
      throw new Error(name);
    },
  });
  return {
    calls,
    request: (body, headers = {}) => handler(new Request('https://simulacao.invalid', {
      method: 'POST', headers, body: JSON.stringify(body),
    })),
  };
}

const signedResponse = {
  action:'respond', token:'sintetico', status:'approved',
  signer:{name:'Pessoa',document:'12345678901',signatureDataUrl:'data:image/png;base64,iVBORw0KGgoAAAA'},
};

for (const data of [false,null,{},'true']) {
  test(`adaptador recusa sucesso sem confirmação booleana: ${JSON.stringify(data)}`, async () => {
    const instance=app({data,error:null});
    assert.equal((await instance.request(signedResponse)).status,409);
  });
}

test('resposta sem assinatura é recusada antes da mutação', async () => {
  const instance=app({data:true,error:null});
  assert.equal((await instance.request({ action:'respond',token:'sintetico',status:'approved' })).status,400);
  assert.deepEqual(instance.calls.map(call => call.name), ['check_rate_limit']);
});

test('resposta assinada passa pelo limite distribuído e por uma RPC transacional', async () => {
  const instance=app({data:true,error:null});
  assert.equal((await instance.request(signedResponse, { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' })).status,200);
  assert.deepEqual(instance.calls.map(call => call.name), ['check_rate_limit', 'submit_signed_quote_response']);
  assert.equal(instance.calls[0].args._endpoint, 'quote-approval:respond');
  assert.match(instance.calls[0].args._identifier, /^[0-9a-f]{64}$/);
});

test('assinatura recebe origem e user-agent capturados pela Edge Function', async () => {
  const instance=app({data:true,error:null});
  const response=await instance.request({
    action:'respond', token:'sintetico', status:'approved',
    signer:{name:'Pessoa',document:'12345678901',signatureDataUrl:'data:image/png;base64,iVBORw0KGgoAAAA'},
  }, { 'cf-connecting-ip':'198.51.100.8', 'user-agent':'navegador-sintetico' });
  assert.equal(response.status,200);
  assert.equal(instance.calls[1].name,'submit_signed_quote_response');
  assert.equal(instance.calls[1].args._signer_ip,'198.51.100.8');
  assert.equal(instance.calls[1].args._signer_user_agent,'navegador-sintetico');
});

test('limite distribuído bloqueia antes da consulta ou mutação', async () => {
  const instance=app({data:true,error:null}, {data:{allowed:false,retry_after_seconds:41},error:null});
  const response=await instance.request({ action:'get_data',token:'sintetico' });
  assert.equal(response.status,429);
  assert.equal(response.headers.get('retry-after'),'41');
  assert.deepEqual(instance.calls.map(call => call.name), ['check_rate_limit']);
});

test('falha do limitador distribuído fecha o acesso', async () => {
  const instance=app({data:true,error:null}, {data:null,error:{code:'XX000'}});
  assert.equal((await instance.request({ action:'get_data',token:'sintetico' })).status,503);
  assert.deepEqual(instance.calls.map(call => call.name), ['check_rate_limit']);
});

test('token ausente não consome limite persistente', async () => {
  const instance=app({data:true,error:null});
  assert.equal((await instance.request({ action:'respond',token:'',status:'approved' })).status,400);
  assert.equal(instance.calls.length,0);
});

test('link inexistente mantém contrato quote null sem falso erro operacional', async () => {
  const instance=app({data:null,error:null});
  const response=await instance.request({ action:'get_data',token:'sintetico' });
  assert.equal(response.status,200);
  assert.deepEqual(JSON.parse(await response.text()),{quote:null});
});

test('erro interno não expõe mensagem do banco', async () => {
  const instance=app({data:null,error:{code:'XX000',message:'detalhe-sigiloso'}});
  const response=await instance.request({ action:'get_data',token:'sintetico' });
  assert.equal(response.status,503);
  assert.doesNotMatch(await response.text(),/detalhe-sigiloso/);
});
