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
  console.log('🔍 Iniciando Preflight Healthcheck...');
  
  const url = `${supabaseUrl}/functions/v1/health-check`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.status === 'healthy') {
      console.log('✅ Sistema está SAUDÁVEL!');
      console.log(`⏱️ Latência total: ${data.total_latency_ms}ms`);
      console.table(data.checks);
      process.exit(0);
    } else {
      console.error('❌ Sistema em estado DEGRADADO ou UNHEALTHY!');
      console.table(data.checks);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro ao conectar com a Edge Function de Healthcheck:', error.message);
    process.exit(1);
  }
}

runHealthcheck();
