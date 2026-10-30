import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('❌ Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não configurados no .env');
  process.exit(1);
}

async function runHealthcheck() {
  console.log('🔍 Iniciando Preflight Healthcheck (liveness)...');

  const url = `${supabaseUrl}/functions/v1/health-check`;

  try {
    // health-check é agora uma sonda de liveness: GET, sem body
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
      }
    });

    const data = await response.json();

    // Sonda de liveness responde { status: "ok" }
    if (response.ok && data.status === 'ok') {
      console.log('✅ Liveness check OK — Edge Function está ativa.');
      process.exit(0);
    } else {
      console.error('❌ Liveness check falhou:', response.status, JSON.stringify(data));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro ao conectar com a Edge Function de Healthcheck:', error.message);
    process.exit(1);
  }
}

runHealthcheck();
