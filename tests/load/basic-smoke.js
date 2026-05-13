import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Basic Load Test (Smoke)
 * Purpose: Ensure the platform handles moderate concurrency without 5xx errors.
 * Run locally with: k6 run tests/load/basic-smoke.js
 */

export const options = {
  vus: 10, // Virtual Users
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
    http_req_failed: ['rate<0.01'],    // Error rate below 1%
  },
};

const BASE_URL = __ENV.SMOKE_BASE_URL || 'http://localhost:8080';

export default function () {
  // 1. Home Page
  const resHome = http.get(`${BASE_URL}/`);
  check(resHome, {
    'status is 200 (Home)': (r) => r.status === 200,
  });

  // 2. Auth Ping (Edge Function)
  const resPing = http.post(`${BASE_URL}/functions/v1/external-db-bridge`, JSON.stringify({
    operation: 'ping'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(resPing, {
    'status is 200 (Bridge Ping)': (r) => r.status === 200,
    'warm is true': (r) => JSON.parse(r.body).warm === true,
  });

  sleep(1);
}
