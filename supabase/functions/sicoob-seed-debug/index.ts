import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import { authorize } from "../_shared/authorize.ts";

Deno.serve(async (req) => {
  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "sicoob-seed-debug", requestId, req });
  log.info("debug_start");

  const auth = await authorize(req, { requireRole: "dev", enforceServerSide: true });
  if (!auth.ok) return log.respond(auth.response);

  const { data, error } = await auth.supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (error) {
    log.error("list_users_failed", { err: error.message });
  } else {
    log.info("debug_completed", { user_count: data?.users?.length });
  }

  return log.respond(new Response(JSON.stringify({
    listUsers_error: error?.message ?? null,
    auth_admin_reachable: !error && Array.isArray(data?.users),
  }, null, 2), {
    headers: { "Content-Type": "application/json" },
  }));
});
