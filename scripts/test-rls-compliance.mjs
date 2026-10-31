import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { validateE2ETarget } from './e2e-target.mjs';

const url = process.env.E2E_SUPABASE_URL;
const publishableKey = process.env.E2E_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
const projectId = process.env.E2E_SUPABASE_PROJECT_ID;
const allowedProjectId = process.env.E2E_ALLOWED_PROJECT_ID;

validateE2ETarget({
  url,
  projectId,
  allowedProjectId,
  publishableKey,
  serviceRoleKey,
});

const client = (key) =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const admin = client(serviceRoleKey);
const actorA = client(publishableKey);
const actorB = client(publishableKey);
const suffix = randomUUID();
const emailA = `rls-a-${suffix}@example.com`;
const emailB = `rls-b-${suffix}@example.com`;
const passwordA = `Qa!${randomBytes(18).toString('base64url')}1a`;
const passwordB = `Qa!${randomBytes(18).toString('base64url')}1b`;
let userAId;
let userBId;
let quoteId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createPersona(email, password, label) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(
      `Falha ao criar a persona efêmera ${label}: ${error?.message ?? 'usuário ausente'}`,
    );
  }
  return data.user.id;
}

async function signIn(instance, email, password, label) {
  const { data, error } = await instance.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(`Falha no login da persona ${label}: ${error?.message ?? 'usuário ausente'}`);
  }
  return data.user.id;
}

async function selectedQuoteIds(instance) {
  const { data, error } = await instance.from('quotes').select('id').eq('id', quoteId).limit(1);
  if (error) throw new Error(`Consulta RLS inconclusiva: ${error.message}`);
  return (data ?? []).map((row) => row.id);
}

async function cleanup() {
  await Promise.allSettled([actorA.auth.signOut(), actorB.auth.signOut()]);
  const errors = [];
  if (quoteId) {
    const { error } = await admin.from('quotes').delete().eq('id', quoteId);
    if (error) errors.push(`orçamento de QA: ${error.message}`);
  }
  if (userAId) {
    const { error } = await admin.auth.admin.deleteUser(userAId);
    if (error) errors.push(`persona A: ${error.message}`);
  }
  if (userBId) {
    const { error } = await admin.auth.admin.deleteUser(userBId);
    if (error) errors.push(`persona B: ${error.message}`);
  }
  return errors;
}

async function testCompliance() {
  let testError;
  try {
    userAId = await createPersona(emailA, passwordA, 'A');
    userBId = await createPersona(emailB, passwordB, 'B');
    const [signedA, signedB] = await Promise.all([
      signIn(actorA, emailA, passwordA, 'A'),
      signIn(actorB, emailB, passwordB, 'B'),
    ]);
    assert(
      signedA === userAId && signedB === userBId && signedA !== signedB,
      'As sessões autenticadas não correspondem às personas efêmeras.',
    );

    const inserted = await actorB
      .from('quotes')
      .insert({
        seller_id: userBId,
        client_name: '[QA RLS] isolamento entre vendedores',
        status: 'draft',
        subtotal: 100,
        total: 100,
      })
      .select('id')
      .single();
    if (inserted.error || !inserted.data) {
      throw new Error(
        `A persona proprietária não conseguiu criar o orçamento: ${inserted.error?.message ?? 'linha ausente'}`,
      );
    }
    quoteId = inserted.data.id;

    const [idsA, idsB] = await Promise.all([selectedQuoteIds(actorA), selectedQuoteIds(actorB)]);
    assert(
      idsB.length === 1 && idsB[0] === quoteId,
      'A fixture privada não está visível para a persona proprietária B.',
    );
    assert(idsA.length === 0, 'VULNERABILIDADE: a persona A leu o orçamento privado da persona B.');

    const foreignUpdate = await actorA
      .from('quotes')
      .update({ notes: '[QA RLS] alteração indevida' })
      .eq('id', quoteId)
      .select('id');
    assert(
      !foreignUpdate.error && (foreignUpdate.data ?? []).length === 0,
      'VULNERABILIDADE: a persona A alterou ou obteve erro inesperado ao alterar o orçamento de B.',
    );

    const foreignDelete = await actorA.from('quotes').delete().eq('id', quoteId).select('id');
    assert(
      !foreignDelete.error && (foreignDelete.data ?? []).length === 0,
      'VULNERABILIDADE: a persona A removeu ou obteve erro inesperado ao remover o orçamento de B.',
    );

    const ownerUpdate = await actorB
      .from('quotes')
      .update({ notes: '[QA RLS] alteração do proprietário' })
      .eq('id', quoteId)
      .select('id,notes')
      .single();
    assert(
      !ownerUpdate.error && ownerUpdate.data?.id === quoteId,
      `A persona proprietária não conseguiu atualizar seu orçamento: ${ownerUpdate.error?.message ?? 'linha ausente'}`,
    );

    const ownerDelete = await actorB
      .from('quotes')
      .delete()
      .eq('id', quoteId)
      .select('id')
      .single();
    assert(
      !ownerDelete.error && ownerDelete.data?.id === quoteId,
      `A persona proprietária não conseguiu remover seu orçamento: ${ownerDelete.error?.message ?? 'linha ausente'}`,
    );
    quoteId = undefined;

    console.log(
      'Isolamento RLS confirmado com duas personas efêmeras e as quatro operações de quotes.',
    );
  } catch (error) {
    testError = error;
  }

  const cleanupErrors = await cleanup();
  if (testError && cleanupErrors.length > 0) {
    throw new AggregateError(
      [testError, new Error(`Falha ao remover dados efêmeros de QA: ${cleanupErrors.join('; ')}`)],
      'A validação RLS falhou e o cleanup deixou resíduos no projeto de QA.',
    );
  }
  if (testError) throw testError;
  if (cleanupErrors.length > 0) {
    throw new Error(`Falha ao remover dados efêmeros de QA: ${cleanupErrors.join('; ')}`);
  }
}

testCompliance().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
