import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.23.8";

const NotificationSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  message: z.string().min(1).max(5000),
  type: z.string().max(50).optional().default('info'),
  category: z.string().max(50).optional().default('system'),
  action_url: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

function jsonRes(corsHeaders: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const rawBody = await req.json();
    const parsed = NotificationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonRes(corsHeaders, { error: 'Invalid payload', details: parsed.error.flatten().fieldErrors }, 400);
    }

    const payload = parsed.data;

    // 1. Verificar Preferências do Usuário
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', payload.user_id)
      .maybeSingle();

    // Se tiver preferência configurada e o evento estiver desabilitado, ignorar
    const eventType = payload.metadata?.event_type as string;
    if (prefs && eventType && prefs.events_config && prefs.events_config[eventType] === false) {
      return jsonRes(corsHeaders, { success: true, skipped: true, reason: 'Event disabled in preferences' });
    }

    // 2. Insert into workspace_notifications (Push/UI)
    const { data: notification, error } = await supabase
      .from('workspace_notifications')
      .insert({
        user_id: payload.user_id,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        category: payload.category,
        action_url: payload.action_url || null,
        metadata: payload.metadata || null,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Email (se habilitado)
    if (!prefs || prefs.email_enabled) {
      // Aqui integraria com o send-transactional-email ou similar
      console.log(`Simulando envio de email para ${payload.user_id}: ${payload.title}`);
    }

    // 4. WhatsApp (se habilitado e disponível)
    if (prefs?.whatsapp_enabled) {
      console.log(`Simulando envio de WhatsApp para ${payload.user_id}`);
    }

    return jsonRes(corsHeaders, { 
      success: true, 
      notification_id: notification.id,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonRes(corsHeaders, { error: errorMessage }, 500);
  }
});
