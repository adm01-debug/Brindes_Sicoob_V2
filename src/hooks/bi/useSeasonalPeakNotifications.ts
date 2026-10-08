/**
 * useSeasonalPeakNotifications — dispara notificação proativa quando o cliente
 * selecionado entra a ≤7 dias de pico sazonal histórico.
 *
 * Estratégia: client-side guard. Quando o usuário acessa o BI de um cliente e
 * `useClientSeasonality` indica daysToNextPeak ≤ 7 e ainda não notificamos hoje,
 * insere uma `workspace_notification` (com chave de deduplicação em localStorage).
 *
 * Não cria cron — segue padrão do projeto (poll/polling em hooks).
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Args {
  clientId: string | null;
  clientName: string;
  daysToNextPeak: number | null;
  nextPeakMonth: number | null;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function dedupKey(userId: string, clientId: string, peakMonth: number) {
  const today = new Date().toISOString().slice(0, 10);
  return `bi.peak-notif.${userId}.${clientId}.${peakMonth}.${today}`;
}

function hasDedupMarker(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

function saveDedupMarker(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // O armazenamento local pode estar indisponível em navegação privada.
  }
}

function peakTitle(clientName: string, daysToNextPeak: number) {
  if (daysToNextPeak === 0) return `📅 ${clientName} está em pico sazonal hoje`;
  const unit = daysToNextPeak === 1 ? "dia" : "dias";
  return `📅 ${clientName} entra em pico em ${daysToNextPeak} ${unit}`;
}

interface NotificationInput {
  userId: string;
  clientId: string;
  clientName: string;
  daysToNextPeak: number;
  nextPeakMonth: number;
  key: string;
}

async function sendPeakNotification(input: NotificationInput) {
  const monthLabel = MONTHS[input.nextPeakMonth - 1] ?? "—";
  const { error } = await supabase.from("workspace_notifications").insert({
    user_id: input.userId,
    title: peakTitle(input.clientName, input.daysToNextPeak),
    message: `${input.clientName} historicamente concentra compras em ${monthLabel}. Momento ideal para abordagem.`,
    type: "info",
    category: "bi_seasonal_peak",
    action_url: `/ferramentas/bi?clientId=${encodeURIComponent(input.clientId)}`,
    metadata: {
      clientId: input.clientId,
      peakMonth: input.nextPeakMonth,
      daysToPeak: input.daysToNextPeak,
    },
  });
  if (!error) saveDedupMarker(input.key);
}

export function useSeasonalPeakNotifications({
  clientId,
  clientName,
  daysToNextPeak,
  nextPeakMonth,
}: Args) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id || !clientId || !clientName) return;
    if (daysToNextPeak === null || nextPeakMonth === null) return;
    if (daysToNextPeak > 7) return;

    const key = dedupKey(user.id, clientId, nextPeakMonth);
    if (hasDedupMarker(key)) return;
    void sendPeakNotification({
      userId: user.id,
      clientId,
      clientName,
      daysToNextPeak,
      nextPeakMonth,
      key,
    }).catch(() => undefined);
  }, [user?.id, clientId, clientName, daysToNextPeak, nextPeakMonth]);
}
