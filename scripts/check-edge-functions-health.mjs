import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FUNCTIONS_TO_CHECK = [
  'ai-recommendations',
  'sicoob-approval-notifications',
  'process-queue',
  'health-check'
];

async function checkFunctions() {
  console.log('📡 Iniciando verificação de saúde das Edge Functions...');
  
  const results = await Promise.all(FUNCTIONS_TO_CHECK.map(async (name) => {
    const start = Date.now();
    try {
      // We assume each function has a GET healthcheck or we just check if it responds to OPTIONS/GET
      const resp = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${supabaseKey}` }
      });
      
      const duration = Date.now() - start;
      return { 
        name, 
        status: resp.status === 200 || resp.status === 401 ? 'UP' : 'DEGRADED', 
        latency: duration,
        httpStatus: resp.status
      };
    } catch (e) {
      return { name, status: 'DOWN', latency: Date.now() - start, error: e.message };
    }
  }));

  console.table(results);
  
  const down = results.filter(r => r.status === 'DOWN');
  if (down.length > 0) {
    console.error(`🚨 ${down.length} funções estão fora do ar!`);
    process.exit(1);
  } else {
    console.log('✅ Todas as Edge Functions críticas estão operacionais.');
  }
}

checkFunctions();
