import { describe, expect, it } from 'vitest';
import { getCorsHeaders } from '../../supabase/functions/_shared/cors';

describe('allowlist CORS das Edge Functions', () => {
  it.each([
    'https://brindes-sicoob-v2.vercel.app',
    'https://brindes-sicoob-v2-nwmn9rhoe-juca1.vercel.app',
  ])('aceita a origem Vercel do próprio portal: %s', (origin) => {
    const headers = getCorsHeaders(new Request('https://edge.invalid', {
      headers: { Origin: origin },
    }));

    expect(headers['Access-Control-Allow-Origin']).toBe(origin);
  });

  it.each([
    'https://outro-projeto.vercel.app',
    'https://brindes-sicoob-v2.vercel.app.atacante.invalid',
  ])('não abre a allowlist para origens externas: %s', (origin) => {
    const headers = getCorsHeaders(new Request('https://edge.invalid', {
      headers: { Origin: origin },
    }));

    expect(headers['Access-Control-Allow-Origin']).not.toBe(origin);
  });
});
