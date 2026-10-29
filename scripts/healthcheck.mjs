import fetch from 'node-fetch';
import dotenv from 'dotenv';
import {
  createHealthcheckRequestOptions,
  isHealthcheckSuccessful,
} from './health-check-contract.mjs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;

if (!supabaseUrl) {
  console.error('❌ Erro: SUPABASE_URL não configurada no .env');
  process.exit(1);
}

async function runHealthcheck() {
  console.log('🔍 Iniciando Preflight Healthcheck...');
  
  const url = `${supabaseUrl}/functions/v1/health-check`;
  
  try {
    const response = await fetch(url, createHealthcheckRequestOptions());
    
    const data = await response.json();
    
    if (isHealthcheckSuccessful(response.ok, data?.status)) {
      console.log(`✅ Sonda de liveness ativa (${data.status}).`);
      process.exit(0);
    } else {
      console.error(`❌ Sonda de liveness indisponível (HTTP ${response.status}; status=${data?.status ?? 'ausente'}).`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro ao conectar com a Edge Function de Healthcheck:', error.message);
    process.exit(1);
  }
}

runHealthcheck();
