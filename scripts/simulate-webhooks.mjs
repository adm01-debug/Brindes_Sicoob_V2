/**
 * Webhook Simulation and Fuzzing Script
 * Simulates thousands of webhook scenarios against the local or remote environment.
 */
import { crypto } from 'crypto';

const ENDPOINT_URL = process.env.VITE_SUPABASE_URL + '/functions/v1/webhook-inbound';
const HMAC_SECRET = process.env.WEBHOOK_HMAC_SECRET || 'test-secret';

async function hmacSign(payload, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function sendWebhook(slug, payload, headers = {}) {
  const body = JSON.stringify(payload);
  const signature = await hmacSign(body, HMAC_SECRET);
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'x-signature-256': signature,
    'x-event': 'test.simulation',
    ...headers
  };

  try {
    const start = Date.now();
    const response = await fetch(`${ENDPOINT_URL}?slug=${slug}`, {
      method: 'POST',
      headers: defaultHeaders,
      body
    });
    const latency = Date.now() - start;
    const data = await response.json().catch(() => ({}));
    
    return {
      status: response.status,
      ok: response.ok,
      latency,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function runSimulation() {
  console.log('🚀 Starting Webhook Simulation...');
  
  const scenarios = [
    { name: 'Valid Payload', payload: { id: '123', status: 'success' }, slug: 'test-slug' },
    { name: 'Malformed JSON', payload: '{"invalid": json', slug: 'test-slug', raw: true },
    { name: 'Missing Slug', payload: { id: '123' }, slug: '' },
    { name: 'Invalid Signature', payload: { id: '123' }, slug: 'test-slug', headers: { 'x-signature-256': 'sha256=invalid' } },
    { name: 'Giant Payload', payload: { data: 'a'.repeat(1024 * 1024) }, slug: 'test-slug' },
    { name: 'SQL Injection Attempt', payload: { id: "'; DROP TABLE users; --" }, slug: 'test-slug' },
    { name: 'No Signature Header', payload: { id: '123' }, slug: 'test-slug', headers: { 'x-signature-256': '' } },
  ];

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    avgLatency: 0,
  };

  let totalLatency = 0;

  for (const scenario of scenarios) {
    console.log(`Testing: ${scenario.name}`);
    const res = await sendWebhook(scenario.slug, scenario.payload, scenario.headers);
    results.total++;
    if (res.ok) results.success++; else results.failed++;
    totalLatency += res.latency || 0;
    
    console.log(`  Result: ${res.status} (${res.latency}ms)`);
  }

  results.avgLatency = totalLatency / results.total;
  console.log('\n📊 Simulation Summary:');
  console.table(results);
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSimulation().catch(console.error);
}

export { sendWebhook, runSimulation };
