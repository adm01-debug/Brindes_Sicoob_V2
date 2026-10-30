const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const FUNCTIONS_TO_CHECK = [
  'ai-recommendations',
  'sicoob-approval-notifications',
  'process-queue',
  'health-check',
];

const REACHABLE_HTTP_STATUSES = new Set([200, 401, 403, 405]);

async function checkFunctions() {
  console.log('📡 Iniciando verificação de saúde das Edge Functions...');

  const results = await Promise.all(
    FUNCTIONS_TO_CHECK.map(async (name) => {
      const start = Date.now();
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${supabaseKey}` },
        });

        const duration = Date.now() - start;
        return {
          name,
          status: REACHABLE_HTTP_STATUSES.has(resp.status) ? 'UP' : 'DEGRADED',
          latency: duration,
          httpStatus: resp.status,
        };
      } catch (e) {
        return { name, status: 'DOWN', latency: Date.now() - start, error: e.message };
      }
    }),
  );

  console.table(results);

  const unhealthy = results.filter((r) => r.status !== 'UP');
  if (unhealthy.length > 0) {
    console.error(`🚨 ${unhealthy.length} funções estão indisponíveis ou degradadas!`);
    process.exit(1);
  } else {
    console.log('✅ Todas as Edge Functions críticas estão operacionais.');
  }
}

checkFunctions();
