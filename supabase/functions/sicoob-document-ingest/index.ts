import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { withStructuredLogging } from '../_shared/structured-logger.ts';
import { DocumentInspectionError, inspectDocumentBytes, sha256Hex, type DocumentPurpose } from './inspection.ts';
import { requireCleanScannerVerdict, ScannerGateError } from './scanner.ts';

const QUARANTINE_BUCKET = 'sicoob-document-quarantine';
const FINAL_BUCKET = 'sicoob-order-documents';
const MAX_BYTES: Record<DocumentPurpose, number> = {
  invoice_pdf: 10 * 1024 * 1024,
  invoice_xml: 10 * 1024 * 1024,
  delivery_proof: 5 * 1024 * 1024,
};

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function isPurpose(value: unknown): value is DocumentPurpose {
  return value === 'invoice_pdf' || value === 'invoice_xml' || value === 'delivery_proof';
}

Deno.serve(withStructuredLogging('sicoob-document-ingest', async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const scannerUrl = Deno.env.get('SICOOB_MALWARE_SCANNER_URL');
  const scannerToken = Deno.env.get('SICOOB_MALWARE_SCANNER_TOKEN');
  const authorization = req.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceKey || !authorization) {
    return json(req, { error: 'Configuração ou autenticação indisponível.' }, 503);
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json(req, { error: 'Sessão inválida ou expirada.' }, 401);

  let quarantinePath: string | null = null;
  let finalPath: string | null = null;
  try {
    const form = await req.formData();
    const orderId = form.get('orderId');
    const purpose = form.get('purpose');
    const file = form.get('file');
    if (typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orderId) || !isPurpose(purpose) || !(file instanceof File)) {
      return json(req, { error: 'Pedido, finalidade ou arquivo inválido.' }, 400);
    }

    const { data: canManage, error: permissionError } = await userClient.rpc(
      'sicoob_current_actor_can_manage_fulfillment',
      { p_order_id: orderId },
    );
    if (permissionError || canManage !== true) return json(req, { error: 'Sem acesso ao pedido.' }, 403);
    if (file.size < 1 || file.size > MAX_BYTES[purpose]) return json(req, { error: 'Arquivo vazio ou acima do limite.' }, 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = inspectDocumentBytes(bytes, purpose);
    const sha256 = await sha256Hex(bytes);
    const documentId = crypto.randomUUID();
    quarantinePath = `${authData.user.id}/${orderId}/${purpose}/${documentId}.${detected.extension}`;
    const folder = purpose === 'delivery_proof' ? 'delivery' : 'invoices';
    finalPath = `${orderId}/${folder}/${documentId}.${detected.extension}`;

    const { error: quarantineError } = await adminClient.storage.from(QUARANTINE_BUCKET)
      .upload(quarantinePath, bytes, { contentType: detected.mime, upsert: false });
    if (quarantineError) throw quarantineError;

    const verdict = await requireCleanScannerVerdict({
      bytes,
      mime: detected.mime,
      purpose,
      sha256,
      url: scannerUrl,
      token: scannerToken,
    });

    const { error: finalUploadError } = await adminClient.storage.from(FINAL_BUCKET)
      .upload(finalPath, bytes, { contentType: detected.mime, upsert: false });
    if (finalUploadError) throw finalUploadError;

    const evidence = {
      clean: true,
      engine: verdict.engine,
      signatureVersion: verdict.signatureVersion,
      inspectedAt: new Date().toISOString(),
    };
    const { error: registerError } = await adminClient.rpc('register_sicoob_clean_document', {
      p_document_id: documentId,
      p_actor_id: authData.user.id,
      p_order_id: orderId,
      p_purpose: purpose,
      p_quarantine_path: quarantinePath,
      p_final_path: finalPath,
      p_sha256: sha256,
      p_detected_mime: detected.mime,
      p_byte_size: bytes.length,
      p_scanner_name: verdict.engine,
      p_scanner_version: evidence.signatureVersion,
      p_scan_evidence: evidence,
    });
    if (registerError) throw registerError;

    await adminClient.storage.from(QUARANTINE_BUCKET).remove([quarantinePath]);
    return json(req, { documentId, path: finalPath, sha256, detectedMime: detected.mime });
  } catch (error) {
    if (finalPath) await adminClient.storage.from(FINAL_BUCKET).remove([finalPath]);
    if (quarantinePath) await adminClient.storage.from(QUARANTINE_BUCKET).remove([quarantinePath]);
    if (error instanceof ScannerGateError) return json(req, { error: error.message }, error.status);
    if (error instanceof DocumentInspectionError) return json(req, { error: error.message }, 422);
    return json(req, { error: 'Não foi possível processar o documento com segurança.' }, 500);
  }
}));
