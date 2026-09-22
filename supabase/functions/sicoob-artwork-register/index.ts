import { withStructuredLogging } from "../_shared/structured-logger.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import {
  ARTWORK_BUCKET,
  MAX_ARTWORK_BYTES,
  assertArtworkContentType,
  assertArtworkPath,
  buildArtworkIdentity,
  sha256Hex,
} from './identity.ts';

interface ArtworkRequest {
  orderId?: unknown;
  filePath?: unknown;
}

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

Deno.serve(withStructuredLogging("sicoob-artwork-register", async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = req.headers.get('Authorization');
    if (!supabaseUrl || !anonKey || !serviceKey || !authorization) {
      return json(req, { error: 'Autenticação necessária para registrar a arte.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json(req, { error: 'Sessão inválida ou expirada.' }, 401);

    const body = await req.json() as ArtworkRequest;
    if (typeof body.orderId !== 'string' || typeof body.filePath !== 'string') {
      return json(req, { error: 'Pedido ou caminho da arte inválido.' }, 400);
    }
    assertArtworkPath(body.orderId, body.filePath);

    // O download usa o JWT do usuário e respeita a RLS do bucket privado. O
    // navegador não fornece hash, tamanho, MIME nem fotografia de identidade.
    const { data: file, error: downloadError } = await userClient.storage
      .from(ARTWORK_BUCKET)
      .download(body.filePath);
    if (downloadError || !file) return json(req, { error: 'Arte não encontrada ou fora do seu escopo.' }, 404);
    if (file.size <= 0 || file.size > MAX_ARTWORK_BYTES) {
      return json(req, { error: 'O arquivo de arte está vazio ou excede 20 MB.' }, 413);
    }
    assertArtworkContentType(body.filePath, file.type);

    const hash = await sha256Hex(await file.arrayBuffer());
    const identity = buildArtworkIdentity({
      filePath: body.filePath,
      sha256: hash,
      byteSize: file.size,
      contentType: file.type,
      verifiedAt: new Date().toISOString(),
    });

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: artworkId, error: registerError } = await adminClient.rpc('create_sicoob_order_artwork_version', {
      p_actor_id: authData.user.id,
      p_order_id: body.orderId,
      p_file_path: body.filePath,
      p_file_sha256: hash,
      p_identity_snapshot: identity,
    });
    if (registerError) throw registerError;
    if (!artworkId) throw new Error('O banco não confirmou o registro da arte.');

    return json(req, { artworkId, sha256: hash });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível registrar a arte.';
    return json(req, { error: message }, 400);
  }
}));
