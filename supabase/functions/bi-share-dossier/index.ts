import { getCorsHeaders } from "../_shared/cors.ts";
/**
 * bi-share-dossier — gera token assinado HMAC para compartilhamento público
 * do dossiê BI (read-only, expira em 7 dias).
 *
 * POST /bi-share-dossier { clientId, clientName, ramoAtividade, expiresInDays? }
 *   → { token, url, expiresAt }
 *
 * GET /bi-share-dossier?token=...
 *   → { valid, payload }  (read-only para a página pública)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const SHARE_SECRET = Deno.env.get("BI_SHARE_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function b64urlEncode(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  const padded = s + "=".repeat(pad);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
function fromUtf8(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

// TS lib estrita do Deno trata `Uint8Array` como `Uint8Array<ArrayBufferLike>`,
// que não satisfaz `BufferSource` (esperado `ArrayBufferView<ArrayBuffer>`).
// Solução: copiar para um `ArrayBuffer` puro antes de passar à WebCrypto.
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

async function hmac(payloadB64: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(utf8(SHARE_SECRET)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, toArrayBuffer(utf8(payloadB64)));
  return b64urlEncode(new Uint8Array(sig));
}

interface Payload {
  clientId: string;
  clientName: string;
  ramoAtividade: string | null;
  sellerId: string;
  iat: number;
  exp: number;
}

async function signToken(payload: Payload): Promise<string> {
  const json = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(utf8(json));
  const sig = await hmac(payloadB64);
  return `${payloadB64}.${sig}`;
}

async function verifyToken(token: string): Promise<Payload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = await hmac(payloadB64);
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(fromUtf8(b64urlDecode(payloadB64))) as Payload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!SHARE_SECRET) {
    return new Response(
      JSON.stringify({ error: "Server not configured (missing secret)" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const url = new URL(req.url);

    // GET: validar token (rota pública)
    if (req.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ valid: false, error: "missing token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const payload = await verifyToken(token);
      if (!payload) {
        return new Response(JSON.stringify({ valid: false, error: "invalid or expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ valid: true, payload }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: criar token (auth required)
    if (req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json().catch(() => null);
      if (!body || typeof body.clientId !== "string" || typeof body.clientName !== "string") {
        return new Response(JSON.stringify({ error: "Invalid body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresInDays = Math.min(Math.max(Number(body.expiresInDays ?? 7), 1), 30);
      const now = Math.floor(Date.now() / 1000);
      const payload: Payload = {
        clientId: body.clientId,
        clientName: body.clientName,
        ramoAtividade: body.ramoAtividade ?? null,
        sellerId: claims.claims.sub,
        iat: now,
        exp: now + expiresInDays * 86400,
      };
      const tokenStr = await signToken(payload);
      const origin = req.headers.get("origin") ?? "";
      const shareUrl = `${origin}/dossie/${tokenStr}`;

      return new Response(
        JSON.stringify({
          token: tokenStr,
          url: shareUrl,
          expiresAt: new Date(payload.exp * 1000).toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err) {
    console.error("[bi-share-dossier] error", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
