import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { RateLimiter, applyRateLimit } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const approvalLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  keyPrefix: 'quote-approval'
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, token, status, notes, signer } = await req.json();

    if (action === "get_data") {
      // 1. Validar token
      const { data: approvalToken, error: tokenError } = await supabase
        .from("quote_approval_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (tokenError || !approvalToken) {
        throw new Error("Token inválido ou expirado");
      }

      // Verificar expiração
      if (new Date(approvalToken.expires_at) < new Date()) {
        throw new Error("Link de aprovação expirado");
      }

      // 2. Buscar orçamento
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select(`
          *,
          items:quote_items(
            *,
            personalizations:quote_item_personalizations(*)
          )
        `)
        .eq("id", approvalToken.quote_id)
        .single();

      if (quoteError || !quote) {
        throw new Error("Orçamento não encontrado");
      }

      // 3. Buscar informações do vendedor (opcional)
      const { data: seller } = await supabase
        .from("profiles")
        .select("full_name, email, phone, avatar_url")
        .eq("user_id", quote.seller_id)
        .single();

      return new Response(
        JSON.stringify({ quote, approval: approvalToken, seller }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "respond") {
      // 1. Validar token
      const { data: approvalToken, error: tokenError } = await supabase
        .from("quote_approval_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (tokenError || !approvalToken) {
        throw new Error("Token inválido");
      }

      if (approvalToken.status !== "pending") {
        throw new Error("Este orçamento já foi respondido");
      }

      // 2. Atualizar token
      const { error: updateTokenError } = await supabase
        .from("quote_approval_tokens")
        .update({
          status: status === "approved" ? "approved" : "rejected",
          responded_at: new Date().toISOString(),
          response_notes: notes,
          signer_name: signer?.name,
          signer_document: signer?.document,
          signer_ip: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for"),
          signer_user_agent: req.headers.get("user-agent"),
        })
        .eq("id", approvalToken.id);

      if (updateTokenError) throw updateTokenError;

      // 3. Atualizar orçamento
      const { error: updateQuoteError } = await supabase
        .from("quotes")
        .update({
          status: status === "approved" ? "approved" : "rejected",
          client_response: status === "approved" ? "approved" : "rejected",
          client_response_at: new Date().toISOString(),
          client_response_notes: notes,
        })
        .eq("id", approvalToken.quote_id);

      if (updateQuoteError) throw updateQuoteError;

      // 4. Logar no histórico
      await supabase.from("quote_history").insert({
        quote_id: approvalToken.quote_id,
        action: "status_changed",
        description: `Orçamento ${status === "approved" ? "aprovado" : "rejeitado"} pelo cliente ${signer?.name || ""}`,
        user_id: approvalToken.seller_id, // Atribuir ao vendedor para visualização
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Ação inválida");
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
