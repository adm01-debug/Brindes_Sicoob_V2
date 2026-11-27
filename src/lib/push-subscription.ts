// src/lib/push-subscription.ts

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Inscrição Web Push de verdade.
 *
 * `Notification.requestPermission()` sozinho só permite notificação local, com a aba
 * aberta. Receber com o app fechado exige duas metades: inscrever o Service Worker
 * no push service do navegador e guardar o `endpoint` (esta camada), e um emissor
 * no servidor que assine e envie para esse endpoint. **Hoje só a primeira metade
 * existe**: nenhuma function envia Web Push, então o estado 'inscrito' significa
 * dispositivo pronto para receber, não entrega garantida.
 *
 * O par VAPID identifica este servidor perante o navegador. A chave pública vai no
 * bundle por design (é pública); a privada fica só no servidor, usada para assinar
 * o envio. Sem a pública o navegador recusa a inscrição.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type ResultadoInscricao =
  | { ok: true; endpoint: string }
  | { ok: false; motivo: 'sem-suporte' | 'sem-chave' | 'permissao-negada' | 'falha-servico' | 'falha-persistencia'; detalhe?: string };

export function base64UrlParaBytes(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binario = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function chaveParaBase64(chave: ArrayBuffer | null): string | null {
  if (!chave) return null;
  return btoa(String.fromCharCode(...new Uint8Array(chave)));
}

function detectarDispositivo(): string | null {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function pushSuportadoNoNavegador(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Inscreve o navegador e persiste o endpoint em `push_subscriptions`.
 *
 * Idempotente: se já existe inscrição ativa, reaproveita o endpoint em vez de
 * criar outra. O upsert usa `(user_id, endpoint)` porque é essa a constraint
 * `unique_subscription` — o mesmo dispositivo reconectando reusa a linha, e o
 * mesmo navegador usado por outro usuário ganha a dele.
 */
export async function inscreverPush(userId: string): Promise<ResultadoInscricao> {
  if (!pushSuportadoNoNavegador()) {
    return { ok: false, motivo: 'sem-suporte' };
  }

  if (!VAPID_PUBLIC_KEY) {
    logger.warn('[push] VITE_VAPID_PUBLIC_KEY ausente; inscrição não é possível');
    return { ok: false, motivo: 'sem-chave' };
  }

  if (Notification.permission === 'denied') {
    return { ok: false, motivo: 'permissao-negada' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const existente = await registration.pushManager.getSubscription();
    const subscription =
      existente ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlParaBytes(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      }));

    const endpoint = subscription.endpoint;
    const p256dh = chaveParaBase64(subscription.getKey('p256dh'));
    const auth = chaveParaBase64(subscription.getKey('auth'));

    if (!p256dh || !auth) {
      return { ok: false, motivo: 'falha-servico', detalhe: 'chaves do navegador ausentes' };
    }

    // A chave natural é (user_id, endpoint) — constraint `unique_subscription`.
    // Um endpoint reaproveitado por outro usuário no mesmo navegador gera linha
    // própria, e o mesmo usuário reconectando reusa a dele.
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent.slice(0, 500),
          device_type: detectarDispositivo(),
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' },
      );

    if (error) {
      logger.error('[push] falha ao salvar inscrição:', error.message);
      return { ok: false, motivo: 'falha-persistencia', detalhe: error.message };
    }

    logger.log('✅ Push inscrito:', endpoint.slice(0, 48));
    return { ok: true, endpoint };
  } catch (error) {
    const detalhe = error instanceof Error ? error.message : String(error);
    logger.error('[push] falha ao inscrever:', detalhe);
    return { ok: false, motivo: 'falha-servico', detalhe };
  }
}

/**
 * Cancela a inscrição no navegador e desativa a linha correspondente.
 * Chamar antes de remover o registro evita que o servidor siga enviando para
 * um endpoint que o push service já descartou.
 */
export async function desinscreverPush(userId: string): Promise<boolean> {
  if (!pushSuportadoNoNavegador()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    // O banco vem primeiro: `unsubscribe()` apaga a única referência ao
    // endpoint, então se o update falhasse depois dele a linha ficaria ativa
    // para sempre e sem como ser corrigida pela UI.
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint);

    if (error) {
      logger.error('[push] endpoint não desativado, inscrição local mantida:', error.message);
      return false;
    }

    await subscription.unsubscribe();
    return true;
  } catch (error) {
    logger.error('[push] falha ao desinscrever:', error);
    return false;
  }
}
/**
 * Inscrição ativa **da conta informada** neste navegador.
 *
 * A inscrição do navegador é do service worker, não da sessão: trocar de conta
 * no mesmo navegador herda a inscrição da conta anterior. Por isso o estado só
 * conta quando existe a linha `(user_id, endpoint)` no banco — sem isso a tela
 * mostraria "inscrito" para quem nunca gravou nada.
 */
export async function inscricaoAtiva(userId: string): Promise<boolean> {
  if (!pushSuportadoNoNavegador()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return false;

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', sub.endpoint)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      logger.warn('[push] não foi possível conferir a inscrição:', error.message);
      return false;
    }
    return data !== null;
  } catch {
    return false;
  }
}
