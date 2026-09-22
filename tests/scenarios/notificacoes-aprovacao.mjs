import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function carregar({ segredo = 'segredo-sintetico', settings = [], erro = null, statusEntrega = 200, emailConfigurado = false, falhaConfirmacao = false, falhaRede = false, ackInvalido = false, amount = 25, contratoInvalido = false, eventKind = undefined, estadoInicial = [] } = {}) {
  let handler, clientes = 0;
  const envios = [];
  const fila = estadoInicial.map(row => ({ ...row }));
  const fonte = readFileSync('supabase/functions/sicoob-approval-notifications/index.ts', 'utf8');
  const codigo = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const registros = { sicoob_approval_requests: { requester_id: 'ator-real', amount_at_request: 25, request_reason: 'motivo-real' }, profiles: { pa_id: 'pa-real', full_name: 'Nome real' }, pa_notification_settings: settings };
  const cliente = { rpc: async (name,args) => {
    if (erro) return { data: null, error: erro };
    if (name === 'enqueue_sicoob_approval_notifications') {
      for (const [index, setting] of settings.entries()) {
        const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
        if (!fila.some(row => row.id === id)) fila.push({ id, state: 'pending', channel: setting.channel, destination: setting.channel === 'slack' ? setting.webhook_url : setting.recipient_email, payload: contratoInvalido ? null : { requester_name: 'Nome real', amount, reason: 'motivo-real', event_kind: eventKind }, lease_token: '99999999-9999-4999-8999-999999999999' });
      }
      return { data: fila.length, error: null };
    }
    if (name === 'claim_sicoob_approval_delivery') {
      const row = fila.find(row => row.state === 'pending');
      if (row) row.state = 'sending';
      return { data: row ? [{ ...row }] : [], error: null };
    }
    if (name === 'finish_sicoob_approval_delivery') {
      if (falhaConfirmacao) return { data: false, error: null };
      const row = fila.find(row => row.id === args.p_id);
      assert.equal(row.state, 'sending');
      row.state = args.p_outcome;
      row.error = args.p_error_code;
      row.provider = args.p_provider_id;
      return { data: true, error: null };
    }
    if (name === 'get_sicoob_approval_delivery_summary') {
      const data = { delivered: 0, pending: 0, uncertain: 0, failed: 0, cancelled: 0 };
      for (const row of fila) data[['sending','retry'].includes(row.state) ? 'pending' : row.state]++;
      return { data, error: null };
    }
    throw new Error(`RPC inesperada: ${name}`);
  }, from: tabela => {
    const consulta = { select: () => consulta, eq: () => consulta, single: () => consulta, maybeSingle: () => consulta, then: resolve => resolve({ data: registros[tabela], error: erro }) };
    return consulta;
  } };
  const contexto = {
    exports: {}, Response, URL, AbortSignal,
    Deno: { env: { get: name => ({ SUPABASE_SERVICE_ROLE_KEY: 'service-role-sintetica', SICOOB_APPROVAL_WORKER_SECRET: segredo, SUPABASE_URL: 'https://simulacao.invalid', PUBLIC_APP_URL: 'https://simulacao.invalid', RESEND_API_KEY: emailConfigurado ? 'chave-sintetica' : undefined, NOTIFICATION_FROM_EMAIL: emailConfigurado ? 'portal@example.invalid' : undefined })[name] } },
    fetch: async (url, opts) => {
      const index=envios.length;
      envios.push({ url, opts });
      if (falhaRede) throw new Error('detalhe-sigiloso');
      const status = Array.isArray(statusEntrega) ? statusEntrega[index] ?? 200 : statusEntrega;
      return new Response(ackInvalido ? '{}' : url.includes('resend.com') ? '{"id":"email-sintetico"}' : 'ok', { status });
    },
    require: name => {
      if (name.includes('http/server')) return { serve: fn => { handler = fn; } };
      if (name.includes('supabase-js')) return { createClient: () => { clientes++; return cliente; } };
      if (name.includes('structured-logger')) return { withStructuredLogging: (_fn, callback) => callback };
      if (name.includes('approval-delivery')) {
        const module = { ...contexto, exports: {} };
        vm.runInNewContext(ts.transpileModule(readFileSync('supabase/functions/_shared/approval-delivery.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, module);
        return module.exports;
      }
      throw new Error(`Dependência inesperada: ${name}`);
    },
  };
  vm.runInNewContext(codigo, contexto);
  return { chamar: handler, envios, fila, retomar: () => { for (const row of fila) if (row.state === 'retry') row.state = 'pending'; }, clientes: () => clientes };
}
function requisicao(credencial = 'segredo-sintetico', evento = { type: 'INSERT', payload: { table: 'sicoob_approval_requests', record: { id: '66666666-6666-4666-8666-666666666666', request_reason: 'motivo-forjado' } } }) {
  return new Request('https://simulacao.invalid', { method: 'POST', headers: credencial ? { Authorization: `Bearer ${credencial}` } : {}, body: JSON.stringify(evento) });
}
for (const credencial of [null, 'token-de-usuario', 'prefixo-segredo-sintetico', 'segredo-sintetico-sufixo']) {
  test(`webhook bloqueia credencial indevida antes de acessar banco: ${credencial}`, async () => {
    const app = carregar();
    assert.equal((await app.chamar(requisicao(credencial))).status, 401);
    assert.equal(app.clientes(), 0);
    assert.equal(app.envios.length, 0);
  });
}
test('ausência de credencial configurada não permite chamada anônima', async () => {
  const app = carregar({ segredo: '' });
  assert.equal((await app.chamar(requisicao(null))).status, 503);
  assert.equal(app.clientes(), 0);
});
test('evento inválido não é declarado entregue', async () => {
  const app = carregar();
  assert.equal((await app.chamar(requisicao(undefined, { type: 'DELETE' }))).status, 400);
  assert.equal(app.envios.length, 0);
});
test('solicitação sem canal configurado não é declarada entregue', async () => {
  const app = carregar();
  const response = await app.chamar(requisicao());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'nenhum_destino_configurado');
});
const slack = { channel: 'slack', webhook_url: 'https://hooks.slack.com/services/sintetico' };
for (const caso of [
  { nome: 'banco indisponível', options: { erro: { message: 'segredo-no-erro' } }, esperado: 503 },
  { nome: 'destino externo indevido', options: { settings: [{ ...slack, webhook_url: 'http://127.0.0.1/servico' }] }, esperado: 503 },
]) {
  test(`${caso.nome} falha sem enviar mensagem`, async () => {
    const app = carregar(caso.options);
    const response = await app.chamar(requisicao());
    assert.equal(response.status, caso.esperado);
    assert.equal(app.envios.length, 0);
    assert.doesNotMatch(await response.text(), /segredo-no-erro|example.invalid/);
  });
}
for (const statusEntrega of [200, 429, 500]) {
  test(`resposta do destino ${statusEntrega} determina o resultado, usando dados do banco`, async () => {
    const app = carregar({ settings: [slack], statusEntrega });
    assert.equal((await app.chamar(requisicao())).status, statusEntrega === 200 ? 200 : statusEntrega === 429 ? 202 : 503);
    assert.equal(app.envios.length, 1);
    assert.match(app.envios[0].opts.body, /motivo-real/);
    assert.doesNotMatch(app.envios[0].opts.body, /motivo-forjado/);
    assert.equal(app.envios[0].opts.redirect, 'error');
  });
}

test('envelope nativo do Database Webhook é aceito', async () => {
  const app = carregar({ settings: [slack] });
  const response = await app.chamar(requisicao(undefined, { type: 'INSERT', schema: 'public', table: 'sicoob_approval_requests', record: { id: '66666666-6666-4666-8666-666666666666' } }));
  assert.equal(response.status, 200);
  assert.equal(app.envios.length, 1);
});
test('JSON inválido retorna erro de entrada', async () => {
  const app = carregar();
  const response = await app.chamar(new Request('https://simulacao.invalid', { method: 'POST', headers: { Authorization: 'Bearer segredo-sintetico' }, body: '{' }));
  assert.equal(response.status, 400);
  assert.equal(app.envios.length, 0);
});

test('repetição do webhook não reenvia uma entrega confirmada', async () => {
  const app = carregar({ settings: [slack] });
  await app.chamar(requisicao());
  await app.chamar(requisicao());
  assert.equal(app.envios.length, 1);
});

test('duas instâncias concorrentes não enviam a mesma entrega', async () => {
  const app = carregar({ settings: [slack] });
  await Promise.all([app.chamar(requisicao()), app.chamar(requisicao())]);
  assert.equal(app.envios.length, 1);
});

const email = { channel: 'email', recipient_email: 'qa@example.invalid' };
for (const amount of [null, '', -10]) {
  test(`valor inválido não vira zero em mensagem financeira: ${JSON.stringify(amount)}`, async () => {
    const app=carregar({ settings:[slack],amount });
    assert.equal((await app.chamar(requisicao())).status,503);
    assert.equal(app.envios.length,0);
  });
}
test('email só confirma depois do aceite do provedor e usa chave de idempotência', async () => {
  const app=carregar({ settings: [email], emailConfigurado: true });
  assert.equal((await app.chamar(requisicao())).status,200);
  assert.equal(app.envios[0].url,'https://api.resend.com/emails');
  assert.equal(app.envios[0].opts.headers['Idempotency-Key'],'sicoob-approval/00000000-0000-4000-8000-000000000001');
  assert.equal(JSON.parse(app.envios[0].opts.body).to[0],'qa@example.invalid');
});
test('falta de configuração de email não impede Slack e não finge sucesso', async () => {
  const app=carregar({ settings: [slack,email] });
  const response=await app.chamar(requisicao());
  assert.equal(response.status,202);
  assert.equal(app.envios.length,1);
  assert.equal((await response.json()).success,false);
  assert.equal(app.fila[1].error,'email_not_configured');
});
test('retry de falha parcial envia somente o canal pendente', async () => {
  const app=carregar({ settings: [slack,email], emailConfigurado:true, statusEntrega:[200,429,200] });
  assert.equal((await app.chamar(requisicao())).status,202);
  app.retomar();
  assert.equal((await app.chamar(requisicao())).status,200);
  assert.equal(app.envios.length,3);
  assert.equal(app.envios.filter(x=>x.url.includes('slack.com')).length,1);
  assert.equal(app.envios[1].opts.headers['Idempotency-Key'],app.envios[2].opts.headers['Idempotency-Key']);
});
for (const options of [{ falhaRede:true },{ statusEntrega:500 },{ ackInvalido:true }]) {
  test(`resultado incerto não é reenviado automaticamente: ${JSON.stringify(options)}`, async () => {
    const app=carregar({ settings:[slack],...options });
    assert.equal((await app.chamar(requisicao())).status,503);
    await app.chamar(requisicao());
    assert.equal(app.envios.length,1);
    assert.equal(app.fila[0].state,'uncertain');
  });
}
test('falha de confirmação no banco não anuncia entrega nem reenvia', async () => {
  const app=carregar({ settings:[slack],falhaConfirmacao:true });
  assert.equal((await app.chamar(requisicao())).status,503);
  await app.chamar(requisicao());
  assert.equal(app.envios.length,1);
});
test('linha reservada com contrato inválido falha sem acessar o provedor', async () => {
  const app=carregar({settings:[slack],contratoInvalido:true});
  const response=await app.chamar(requisicao());
  assert.equal(response.status,503);
  assert.equal(app.envios.length,0);
  assert.equal(app.fila[0].state,'failed');
  assert.equal(app.fila[0].error,'invalid_delivery_contract');
});
test('worker de fila sem credencial de serviço não envia', async () => {
  const app=carregar({ settings:[slack] });
  assert.equal((await app.chamar(requisicao('usuario',{action:'process_queue'}))).status,401);
  assert.equal(app.envios.length,0);
});
test('worker de fila retoma entregas já registradas', async () => {
  const app=carregar({settings:[slack],statusEntrega:[429,200]});
  await app.chamar(requisicao()); app.retomar();
  assert.equal((await app.chamar(requisicao(undefined,{action:'process_queue'}))).status,200);
  assert.equal(app.envios.length,2);
});
test('worker global não falha para sempre por um erro terminal histórico', async () => {
  const app=carregar({estadoInicial:[{
    id:'00000000-0000-4000-8000-000000000099', state:'failed', channel:'slack',
    destination:'https://hooks.slack.com/services/sintetico', payload:{requester_name:'Nome',amount:25,reason:'motivo'},
    lease_token:'99999999-9999-4999-8999-999999999999', error:'provider_http_400',
  }]});
  const response=await app.chamar(requisicao(undefined,{action:'process_queue'}));
  assert.equal(response.status,200);
  assert.equal((await response.json()).success,true);
  assert.equal(app.envios.length,0);
});
test('escalação informa a Diretoria no conteúdo enviado', async () => {
  const app=carregar({settings:[slack],eventKind:'escalated_to_board'});
  assert.equal((await app.chamar(requisicao())).status,200);
  assert.match(app.envios[0].opts.body,/escalada para a Diretoria/);
});
