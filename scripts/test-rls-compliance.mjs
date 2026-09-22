import { createClient } from '@supabase/supabase-js';

const required = [
  'SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'RLS_TEST_USER_A_EMAIL',
  'RLS_TEST_USER_A_PASSWORD',
  'RLS_TEST_USER_B_EMAIL',
  'RLS_TEST_USER_B_PASSWORD',
  'RLS_TEST_PRIVATE_QUOTE_B_ID',
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Configuração incompleta do teste RLS: ${missing.join(', ')}`);
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const quoteId = process.env.RLS_TEST_PRIVATE_QUOTE_B_ID;
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function signIn(instance, email, password, label) {
  const { data, error } = await instance.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Falha no login da persona ${label}: ${error?.message ?? 'usuário ausente'}`);
  return data.user;
}

async function visibleQuoteIds(instance) {
  const { data, error } = await instance.from('quotes').select('id').eq('id', quoteId).limit(1);
  if (error) throw new Error(`Consulta RLS inconclusiva: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Contrato inesperado na consulta RLS');
  return data.map((row) => row.id);
}

async function testCompliance() {
  const actorA = client();
  const actorB = client();
  try {
    const [userA, userB] = await Promise.all([
      signIn(actorA, process.env.RLS_TEST_USER_A_EMAIL, process.env.RLS_TEST_USER_A_PASSWORD, 'A'),
      signIn(actorB, process.env.RLS_TEST_USER_B_EMAIL, process.env.RLS_TEST_USER_B_PASSWORD, 'B'),
    ]);
    if (userA.id === userB.id) throw new Error('As duas personas RLS apontam para o mesmo usuário');

    const [idsA, idsB] = await Promise.all([visibleQuoteIds(actorA), visibleQuoteIds(actorB)]);
    if (idsB.length !== 1 || idsB[0] !== quoteId) {
      throw new Error('A fixture privada não está visível para a persona proprietária B');
    }
    if (idsA.length !== 0) {
      throw new Error('VULNERABILIDADE: a persona A leu o orçamento privado da persona B');
    }
    console.log('Isolamento RLS confirmado com duas sessões autenticadas e fixture determinística.');
  } finally {
    await Promise.allSettled([actorA.auth.signOut(), actorB.auth.signOut()]);
  }
}

testCompliance().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
