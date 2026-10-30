/**
 * quote-followup-reminders
 * Cria notificações para vendedores cujos orçamentos enviados há ≥2 dias
 * ainda não foram visualizados pelo cliente. Idempotente por dia (não duplica).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireInternalService } from "../_shared/internal-service-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "metodo_nao_permitido" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const denied = await requireInternalService(req);
  if (denied) return denied;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    // 1) Orçamentos enviados há ≥2d
    const { data: quotes, error: qErr } = await supabase
      .from("quotes")
      .select("id, quote_number, client_name, seller_id, updated_at")
      .in("status", ["sent", "pending"])
      .lte("updated_at", twoDaysAgo)
      .limit(500);

    if (qErr) throw qErr;
    if (!quotes || quotes.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quoteIds = quotes.map((q) => q.id);

    // 2) Filtra os que JÁ foram visualizados via tokens
    const { data: viewed } = await supabase
      .from("quote_approval_tokens")
      .select("quote_id")
      .in("quote_id", quoteIds)
      .not("viewed_at", "is", null);

    const viewedSet = new Set((viewed || []).map((v) => v.quote_id));
    const candidates = quotes.filter((q) => !viewedSet.has(q.id));

    // 3) Idempotência: ignora os que já têm reminder hoje
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: existing } = await supabase
      .from("follow_up_reminders")
      .select("quote_id")
      .in("quote_id", candidates.map((c) => c.id))
      .gte("created_at", todayStart.toISOString());
    const existingSet = new Set((existing || []).map((e) => e.quote_id));

    const toInsert = candidates
      .filter((c) => !existingSet.has(c.id) && c.seller_id)
      .map((c) => ({
        quote_id: c.id,
        seller_id: c.seller_id!,
        reminder_type: "no_view",
        scheduled_for: new Date().toISOString(),
        title: `Orçamento ${c.quote_number} sem visualização`,
        notes: `Cliente ${c.client_name || "—"} ainda não abriu o link. Considere enviar follow-up.`,
        is_sent: true,
        sent_at: new Date().toISOString(),
      }));

    let inserted = 0;
    if (toInsert.length > 0) {
      const { error: insErr, count } = await supabase
        .from("follow_up_reminders")
        .insert(toInsert, { count: "exact" });
      if (insErr) throw insErr;
      inserted = count ?? toInsert.length;
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: quotes.length, candidates: candidates.length, inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("quote-followup-reminders error:", err);
    return new Response(JSON.stringify({ ok: false, error: "erro_interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
