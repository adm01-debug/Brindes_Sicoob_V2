import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(url, key);

  let projectRefFromUrl = "";
  try { projectRefFromUrl = new URL(url).host.split(".")[0]; } catch { /**/ }

  // Decode JWT payload (sem verificar assinatura) só pra inspeção
  let jwtRef = "";
  try {
    const payload = JSON.parse(atob(key.split(".")[1] ?? ""));
    jwtRef = payload.ref ?? payload.iss ?? "";
  } catch { /**/ }

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const emails = (data?.users ?? []).map((u) => u.email).filter(Boolean);

  return new Response(JSON.stringify({
    SUPABASE_URL: url,
    project_ref_from_url: projectRefFromUrl,
    service_key_ref: jwtRef,
    listUsers_error: error?.message ?? null,
    user_count: data?.users?.length ?? 0,
    sample_emails: emails.slice(0, 20),
  }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
