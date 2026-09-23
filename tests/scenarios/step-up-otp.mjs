import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const helperSource = readFileSync('supabase/functions/_shared/step-up-otp-delivery.ts', 'utf8');
const stepUpSource = readFileSync('supabase/functions/step-up-verify/index.ts', 'utf8');

function loadHelper() {
  const source = ts.transpileModule(helperSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'Deno', source)(module, module.exports, { env: { get: () => undefined } });
  return module.exports.deliverStepUpOtp;
}

const valid = {
  challengeId: '11111111-1111-4111-8111-111111111111',
  recipientEmail: 'dev@example.invalid',
  otp: '123456',
  expiresAt: '2026-09-22T22:00:00Z',
};

test('OTP só é aceito com recibo do provedor e idempotência por desafio', async () => {
  const deliver = loadHelper();
  let request;
  const result = await deliver(valid, {
    apiKey: 'chave-sintetica',
    from: 'portal@example.invalid',
    fetcher: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ id: 'email-sintetico' }), { status: 200 });
    },
  });
  assert.deepEqual(result, { accepted: true, providerId: 'email-sintetico' });
  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.options.headers['Idempotency-Key'], `step-up/${valid.challengeId}`);
  assert.equal(request.body.to[0], valid.recipientEmail);
  assert.match(request.body.text, /123456/);
});

test('OTP falha fechado sem configuração, em HTTP não 2xx e em confirmação inválida', async () => {
  const deliver = loadHelper();
  assert.equal((await deliver(valid)).accepted, false);
  for (const response of [
    new Response('{}', { status: 501 }),
    new Response('{}', { status: 200 }),
  ]) {
    const result = await deliver(valid, {
      apiKey: 'chave-sintetica', from: 'portal@example.invalid', fetcher: async () => response,
    });
    assert.equal(result.accepted, false);
  }
});

test('step-up não depende do endpoint legado nem registra prévia do OTP', () => {
  assert.doesNotMatch(stepUpSource, /send-transactional-email|otp_preview/);
  assert.match(stepUpSource, /if \(!delivery\.accepted\)/);
  assert.match(stepUpSource, /otp_delivery_unavailable/);
  assert.match(stepUpSource, /\.from\("step_up_challenges"\)[\s\S]*?\.delete\(\)/);
});
