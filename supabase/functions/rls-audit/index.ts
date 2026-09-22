import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { authorize } from "../_shared/authorize.ts";

interface ScenarioResult {
  table: string;
  op: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  scenario: string;
  expected: "allow" | "deny";
  actual: "allow" | "deny" | "error";
  passed: boolean;
  detail?: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const isAdminAudit = req.headers.get("X-Admin-Audit") === "true";
    const targetUserId = req.headers.get("X-Target-User-Id");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log(`RLS Audit: isAdminAudit=${isAdminAudit}, hasTarget=${!!targetUserId}`);
    
    const isServiceRole = authHeader === `Bearer ${SERVICE}` || req.headers.get("apikey") === SERVICE || req.headers.get("x-supabase-key") === SERVICE;
    
    console.log(`isServiceRole evaluation: ${isServiceRole}`);

    let sellerId: string;
    
    if (isAdminAudit && isServiceRole && targetUserId) {
      sellerId = targetUserId;
      console.log(`Admin audit for user: ${sellerId}`);
    } else {
      if (isServiceRole) {
        return new Response(JSON.stringify({ error: "service_audit_target_required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const auth = await authorize(req, { requireRole: "dev", enforceServerSide: true });
      if (!auth.ok) return auth.response;
      sellerId = auth.user.id;
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const adminClient = createClient(SUPABASE_URL, SERVICE, {
      auth: { persistSession: false },
    });

    const { data: profile } = await adminClient.from("profiles").select("cooperativa_id, pa_id").eq("user_id", sellerId).single();

    const otherSellerId = "00000000-0000-0000-0000-00000000dead";
    const otherCoopId = "11111111-1111-1111-1111-111111111111";
    const otherPaId = "22222222-2222-2222-2222-222222222222";
    const otherOrgId = "33333333-3333-3333-3333-333333333333";

    const results: ScenarioResult[] = [];
    const push = (r: ScenarioResult) => results.push(r);

    const classify = (error: unknown, data: unknown): "allow" | "deny" => {
      if (error) {
        const msg = String((error as { message?: string })?.message ?? "");
        if (/row-level security|permission denied|violates/i.test(msg)) return "deny";
      }
      if (Array.isArray(data) && data.length === 0) return "deny";
      return "allow";
    };

    // 1. SELECT próprio
    const ownQuote = await adminClient.from("quotes").insert({
        seller_id: sellerId,
        client_name: "[RLS-AUDIT] Próprio",
        status: "draft", subtotal: 0, total: 0,
      }).select("id").single();

    if (ownQuote.data) {
      const { data, error } = await userClient.from("quotes").select("id").eq("id", ownQuote.data.id).maybeSingle();
      const actual = error ? "error" : data ? "allow" : "deny";
      push({
        table: "quotes", op: "SELECT", scenario: "Ler próprio orçamento",
        expected: "allow", actual: actual as any, passed: actual === "allow",
        detail: error?.message
      });
    }

    // 2. CROSS-SELLER
    const foreignSellerQuote = await adminClient.from("quotes").insert({
        seller_id: otherSellerId,
        client_name: "[RLS-AUDIT] Outro Vendedor",
        status: "draft", subtotal: 0, total: 0,
      }).select("id").single();

    if (foreignSellerQuote.data) {
      const { data } = await userClient.from("quotes").select("id").eq("id", foreignSellerQuote.data.id).maybeSingle();
      const actual = data ? "allow" : "deny";
      push({
        table: "quotes", op: "SELECT", scenario: "Não ler orçamento de outro vendedor",
        expected: "deny", actual: actual as any, passed: actual === "deny",
      });
      await adminClient.from("quotes").delete().eq("id", foreignSellerQuote.data.id);
    }

    // 3. CROSS-PA
    const foreignPaQuote = await adminClient.from("quotes").insert({
        seller_id: otherSellerId,
        pa_id: otherPaId,
        client_name: "[RLS-AUDIT] Outro PA",
        status: "draft", subtotal: 0, total: 0,
      }).select("id").single();

    if (foreignPaQuote.data) {
      const { data } = await userClient.from("quotes").select("id").eq("id", foreignPaQuote.data.id).maybeSingle();
      const actual = data ? "allow" : "deny";
      push({
        table: "quotes", op: "SELECT", scenario: "Não ler orçamento de outro PA",
        expected: "deny", actual: actual as any, passed: actual === "deny",
      });
      await adminClient.from("quotes").delete().eq("id", foreignPaQuote.data.id);
    }

    // 4. CROSS-COOP
    const foreignCoopQuote = await adminClient.from("quotes").insert({
        seller_id: otherSellerId,
        singular_id: otherCoopId,
        client_name: "[RLS-AUDIT] Outra Coop",
        status: "draft", subtotal: 0, total: 0,
      }).select("id").single();

    if (foreignCoopQuote.data) {
      const { data } = await userClient.from("quotes").select("id").eq("id", foreignCoopQuote.data.id).maybeSingle();
      const actual = data ? "allow" : "deny";
      push({
        table: "quotes", op: "SELECT", scenario: "Não ler orçamento de outra cooperativa",
        expected: "deny", actual: actual as any, passed: actual === "deny",
      });
      await adminClient.from("quotes").delete().eq("id", foreignCoopQuote.data.id);
    }

    // 5. CROSS-ORG
    const foreignOrgQuote = await adminClient.from("quotes").insert({
        seller_id: otherSellerId,
        organization_id: otherOrgId,
        client_name: "[RLS-AUDIT] Outra Org",
        status: "draft", subtotal: 0, total: 0,
      }).select("id").single();

    if (foreignOrgQuote.data) {
      const { data } = await userClient.from("quotes").select("id").eq("id", foreignOrgQuote.data.id).maybeSingle();
      const actual = data ? "allow" : "deny";
      push({
        table: "quotes", op: "SELECT", scenario: "Não ler orçamento de outra organização",
        expected: "deny", actual: actual as any, passed: actual === "deny",
      });
      await adminClient.from("quotes").delete().eq("id", foreignOrgQuote.data.id);
    }

    if (ownQuote.data?.id) await adminClient.from("quotes").delete().eq("id", ownQuote.data.id);

    const summary = {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      seller_id: sellerId,
      ran_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ summary, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`Error in RLS Audit: ${message}`);
    return new Response(
      JSON.stringify({ error: "internal", detail: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
