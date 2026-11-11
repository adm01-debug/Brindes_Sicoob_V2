/**
 * Load and Stress Testing Script
 * Measures latency and stability under high concurrency.
 */

if (!process.env.VITE_SUPABASE_URL) {
  console.error('❌ VITE_SUPABASE_URL não configurada. Configure no .env antes de rodar o load test.');
  process.exit(2);
}
const TARGET_URL = process.env.VITE_SUPABASE_URL + '/functions/v1/health-check';
const CONCURRENCY = 50;
const TOTAL_REQUESTS = 1000;

async function runLoadTest() {
  console.log(`🔥 Starting Load Test on ${TARGET_URL}`);
  console.log(`Concurrency: ${CONCURRENCY}, Total Requests: ${TOTAL_REQUESTS}`);

  const startTime = Date.now();
  const results = {
    success: 0,
    failed: 0,
    latencies: []
  };

  let dispatched = 0;
  const pool = Array(CONCURRENCY).fill(0).map(async () => {
    while (dispatched < TOTAL_REQUESTS) {
      dispatched++; // reserva o slot de forma síncrona, antes do await
      const start = Date.now();
      try {
        const res = await fetch(TARGET_URL);
        const latency = Date.now() - start;
        results.latencies.push(latency);
        if (res.ok) results.success++; else results.failed++;
      } catch {
        results.failed++;
      }
    }
  });

  await Promise.all(pool);

  const totalRequests = results.success + results.failed;
  const totalTime = Date.now() - startTime;
  const sortedLatencies = results.latencies.sort((a, b) => a - b);
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
  const avg = results.latencies.reduce((a, b) => a + b, 0) / results.latencies.length;

  console.log('\n📈 Load Test Results:');
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Requests/sec: ${(totalRequests / (totalTime / 1000)).toFixed(2)}`);
  console.log(`Success Rate: ${((results.success / totalRequests) * 100).toFixed(2)}%`);
  console.log(`Avg Latency: ${avg.toFixed(2)}ms`);
  console.log(`P95 Latency: ${p95.toFixed(2)}ms`);
}

runLoadTest().catch(console.error);
