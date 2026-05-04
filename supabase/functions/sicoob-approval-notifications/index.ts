import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, payload } = await req.json();

    if (type === "INSERT" && payload.table === "sicoob_approval_requests") {
      const request = payload.record;
      
      // Fetch notification settings for the PA
      const { data: requester } = await supabase
        .from("profiles")
        .select("pa_id, full_name")
        .eq("id", request.requester_id)
        .single();

      if (!requester?.pa_id) return new Response(JSON.stringify({ message: "No PA found" }), { headers: corsHeaders });

      const { data: settings } = await supabase
        .from("pa_notification_settings")
        .select("*")
        .eq("pa_id", requester.pa_id)
        .eq("is_active", true);

      for (const setting of settings || []) {
        if (setting.channel === 'slack' && setting.webhook_url) {
          await fetch(setting.webhook_url, {
            method: "POST",
            body: JSON.stringify({
              text: `🚨 *Nova Solicitação de Alçada Sicoob*\n\n*Solicitante:* ${requester.full_name}\n*Valor:* R$ ${request.amount_at_request.toLocaleString()}\n*Motivo:* ${request.request_reason}\n\n<${Deno.env.get("PUBLIC_APP_URL")}/admin/sicoob|Acessar Painel de Aprovação>`,
            }),
          });
        }
        
        if (setting.channel === 'email' && setting.recipient_email) {
          // Send email logic would go here via Resend or internal provider
          console.log(`Sending email to ${setting.recipient_email}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});
