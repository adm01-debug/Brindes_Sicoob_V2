import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";

Deno.serve(async (req) => {
  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "sicoob-seed-debug", requestId, req });
  log.info("debug_start");

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const keyLen = key.length;
  const anonLen = anonKey.length;
  const sameAsAnon = key === anonKey;
  const supabase = createClient(url, key);

  let projectRefFromUrl = "";
  try { projectRefFromUrl = new URL(url).host.split(".")[0]; } catch { /**/ }

  let jwtRef = "";
  try {
    const payload = JSON.parse(atob(key.split(".")[1] ?? ""));
    jwtRef = payload.ref ?? payload.iss ?? "";
  } catch { /**/ }

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const emails = (data?.users ?? []).map((u) => u.email).filter(Boolean);

  if (error) {
    log.error("list_users_failed", { err: error.message });
  } else {
    log.info("debug_completed", { user_count: data?.users?.length });
  }

  return log.respond(new Response(JSON.stringify({
    SUPABASE_URL: url,
    project_ref_from_url: projectRefFromUrl,
    service_key_ref: jwtRef,
    service_key_len: keyLen,
    anon_key_len: anonLen,
    service_eq_anon: sameAsAnon,
    listUsers_error: error?.message ?? null,
    user_count: data?.users?.length ?? 0,
    sample_emails: emails.slice(0, 20),
  }, null, 2), {
    headers: { "Content-Type": "application/json" },
  }));
});