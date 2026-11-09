import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // Extract visitor IP from proxy headers
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;

    let city: string | null = null;
    let countryCode: string | null = null;

    // Server-side geolocation lookup (no CORS/sandbox issues)
    if (ip && ip !== 'unknown') {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,countryCode`, {
          signal: AbortSignal.timeout(3000),
        });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          city = geo.city || null;
          countryCode = geo.countryCode || null;
        }
      } catch {
        // Geo lookup failed, still return IP
      }
    }

    return new Response(
      JSON.stringify({ ip, city, country_code: countryCode }),
      { status: 200, headers }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'erro_interno' }), { status: 500, headers });
  }
});
