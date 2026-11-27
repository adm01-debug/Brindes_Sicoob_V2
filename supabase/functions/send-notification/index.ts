import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.23.8";
import { requireInternalService } from "../_shared/internal-service-auth.ts";
import { enviarPush, type InscricaoPush } from "../_shared/web-push.ts";

const NotificationSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  message: z.string().min(1).max(5000),
  type: z.string().max(50).optional().default('info'),
  category: z.string().max(50).optional().default('system'),
  action_url: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  scheduled_for: z.string().optional().nullable(), // ISO String
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
  if (req.method !== 'POST') {
    return jsonRes(corsHeaders, { error: 'Method not allowed' }, 405);
  }

  const denied = await requireInternalService(req);
  if (denied) return denied;

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

    // 1. Verificar Preferências do Usuário (Canais, DND, Digest)
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', payload.user_id)
      .maybeSingle();

    if (!prefs) {
      // Default behavior se não houver preferências
      return await sendImmediate(supabase, payload, corsHeaders);
    }

    // 2. Respeitar DND (Não Perturbe)
    if (prefs.dnd_enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 100 + now.getMinutes();
      const [startH, startM] = (prefs.dnd_start || '22:00').split(':').map(Number);
      const [endH, endM] = (prefs.dnd_end || '08:00').split(':').map(Number);
      const startTime = startH * 100 + startM;
      const endTime = endH * 100 + endM;

      let isDnd = false;
      if (startTime > endTime) { // Over midnight
        isDnd = currentTime >= startTime || currentTime <= endTime;
      } else {
        isDnd = currentTime >= startTime && currentTime <= endTime;
      }

      if (isDnd) {
        // Se estiver em DND, agendar para o fim do DND
        const scheduledTime = new Date();
        scheduledTime.setHours(endH, endM, 0, 0);
        if (scheduledTime < now) scheduledTime.setDate(scheduledTime.getDate() + 1);
        
        return await scheduleNotification(supabase, payload, scheduledTime.toISOString(), corsHeaders);
      }
    }

    // 3. Respeitar Digest
    if (prefs.digest_enabled) {
      return await addToDigest(supabase, payload, prefs.digest_frequency || 'daily', corsHeaders);
    }

    // 4. Se houver agendamento manual explícito
    if (payload.scheduled_for) {
      return await scheduleNotification(supabase, payload, payload.scheduled_for, corsHeaders);
    }

    // 5. Envio imediato padrão
    return await sendImmediate(supabase, payload, corsHeaders);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonRes(corsHeaders, { error: errorMessage }, 500);
  }
});

async function sendImmediate(supabase: any, payload: any, corsHeaders: any) {
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

  // O canal 'push' so pode ser registrado como sucesso se a entrega foi
  // tentada de fato — antes este log dizia 'success' sem enviar nada.
  const entrega = await enviarParaDispositivos(supabase, payload, notification.id);

  await supabase.from('notification_logs').insert({
    user_id: payload.user_id,
    channel: 'push',
    status: entrega.status,
    error_code: entrega.motivo ?? null,
    provider_response: {
      enviados: entrega.enviados,
      removidos: entrega.removidos,
      motivo: entrega.motivo ?? null,
    },
    execution_time_ms: entrega.duracaoMs,
  });

  return jsonRes(corsHeaders, {
    success: true,
    notification_id: notification.id,
    push: {
      status: entrega.status,
      enviados: entrega.enviados,
      removidos: entrega.removidos,
      motivo: entrega.motivo ?? null,
    },
  });
}

/**
 * Envia a Web Push para todos os dispositivos inscritos do usuario.
 *
 * Sem `VAPID_PRIVATE_KEY`/`VAPID_PUBLIC_KEY` nada e enviado e o motivo fica
 * explicito no log — a notificacao continua existindo em
 * `workspace_notifications`, entao a UI nunca perde o alerta.
 */
async function enviarParaDispositivos(supabase: any, payload: any, notificationId: string) {
  const inicio = Date.now();
  const duracao = () => Date.now() - inicio;

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  if (!publicKey || !privateKey) {
    return { status: 'skipped', enviados: 0, removidos: 0, motivo: 'VAPID nao configurado', duracaoMs: duracao() };
  }

  const { data: inscricoes, error: erroInscricoes } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', payload.user_id)
    .eq('is_active', true);

  if (erroInscricoes) {
    return { status: 'failed', enviados: 0, removidos: 0, motivo: erroInscricoes.message, duracaoMs: duracao() };
  }
  if (!inscricoes?.length) {
    return { status: 'skipped', enviados: 0, removidos: 0, motivo: 'sem dispositivo inscrito', duracaoMs: duracao() };
  }

  const config = {
    publicKey,
    privateKey,
    subject: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:suporte@sicoob.com.br',
  };

  let enviados = 0;
  const expirados: string[] = [];
  let ultimoMotivo: string | null = null;

  await Promise.all(
    (inscricoes as InscricaoPush[]).map(async (inscricao) => {
      const resultado = await enviarPush(inscricao, {
        title: payload.title,
        body: payload.message,
        url: payload.action_url ?? '/',
        tag: notificationId,
      }, config);

      if (resultado.ok) {
        enviados += 1;
        return;
      }
      ultimoMotivo = resultado.motivo;
      if (resultado.expirada && inscricao.id) expirados.push(inscricao.id);
    }),
  );

  if (expirados.length) {
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .in('id', expirados);
  }

  const status = enviados > 0 ? 'success' : 'failed';
  return {
    status,
    enviados,
    removidos: expirados.length,
    motivo: enviados > 0 ? null : ultimoMotivo,
    duracaoMs: duracao(),
  };
}

async function scheduleNotification(supabase: any, payload: any, scheduledFor: string, corsHeaders: any) {
  const { error } = await supabase
    .from('scheduled_notifications')
    .insert({
      user_id: payload.user_id,
      channel: 'omnichannel',
      payload: payload,
      scheduled_for: scheduledFor,
      status: 'scheduled'
    });

  if (error) throw error;
  return jsonRes(corsHeaders, { success: true, status: 'scheduled', scheduled_for: scheduledFor });
}

async function addToDigest(supabase: any, payload: any, frequency: string, corsHeaders: any) {
  // Buscar digest pendente ou criar um novo
  const scheduledTime = new Date();
  scheduledTime.setHours(8, 0, 0, 0); // Sempre às 8 da manhã
  if (scheduledTime < new Date()) scheduledTime.setDate(scheduledTime.getDate() + 1);

  const { data: existingDigest } = await supabase
    .from('notification_digests')
    .select('*')
    .eq('user_id', payload.user_id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingDigest) {
    const newContent = [...(existingDigest.content_data || []), payload];
    await supabase
      .from('notification_digests')
      .update({ content_data: newContent })
      .eq('id', existingDigest.id);
  } else {
    await supabase
      .from('notification_digests')
      .insert({
        user_id: payload.user_id,
        subject: `Seu resumo ${frequency === 'daily' ? 'diário' : 'semanal'}`,
        content_data: [payload],
        scheduled_for: scheduledTime.toISOString(),
        status: 'pending'
      });
  }

  return jsonRes(corsHeaders, { success: true, status: 'digested' });
}
