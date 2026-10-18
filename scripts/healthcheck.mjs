import { pathToFileURL } from 'node:url';

export async function runHealthcheck({
  supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY,
  fetchImpl = fetch,
  makeTimeoutSignal = AbortSignal.timeout,
  logger = console,
} = {}) {
  if (!supabaseUrl) {
    logger.error('❌ Erro: SUPABASE_URL não configurada no .env');
    return false;
  }
  logger.log('🔍 Iniciando Preflight Healthcheck...');
  try {
    const response = await fetchImpl(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/health-check`, {
      method: 'GET',
      signal: makeTimeoutSignal(15_000),
      headers: anonKey ? { apikey: anonKey } : {},
    });
    const data = await response.json();
    if (response.ok && data.status === 'ok') {
      logger.log('✅ Sistema está SAUDÁVEL!');
      return true;
    }
    logger.error('❌ Serviço indisponível ou resposta inválida!');
    return false;
  } catch (error) {
    logger.error('❌ Erro ao conectar com a Edge Function de Healthcheck:', error.message);
    return false;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.loadEnvFile();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  process.exitCode = (await runHealthcheck()) ? 0 : 1;
}
