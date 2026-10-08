/**
 * QuoteHistoryTimeline — timeline de eventos do orçamento (mudanças de status, edições, comentários).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { History, User, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface QuoteHistoryTimelineProps {
  quoteId: string;
}

type TimelineEvent = {
  id: string;
  action: string;
  description: string | null;
  metadata: unknown;
  created_at: string;
  user_id: string | null;
  actor_name?: string | null;
};

function getRejectionNotes(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const notes = (metadata as Record<string, unknown>).rejection_notes;
  return typeof notes === 'string' ? notes : null;
}

async function fetchTimeline(quoteId: string): Promise<TimelineEvent[]> {
  const { data: history, error } = await supabase.from("quote_history")
    .select("id, action, description, metadata, created_at, user_id").eq("quote_id", quoteId).order("created_at", { ascending: false });
  if (error) throw error;
  const userIds = [...new Set((history ?? []).flatMap((event) => event.user_id ? [event.user_id] : []))];
  if (!userIds.length) return (history ?? []) as TimelineEvent[];
  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
  if (profilesError) throw profilesError;
  const names = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.full_name]));
  return (history ?? []).map((event) => ({ ...event, actor_name: event.user_id ? names.get(event.user_id) ?? null : null })) as TimelineEvent[];
}

function TimelineEntry({ event }: { event: TimelineEvent }) {
  const rejectionNotes = getRejectionNotes(event.metadata);
  return <div className="relative pl-10"><div className={cn(
    "absolute left-2 top-0.5 h-4 w-4 rounded-full border-2 bg-background flex items-center justify-center z-10",
    event.action === "status_change" ? "border-primary" : "border-muted-foreground/30")}>
    <div className="h-1.5 w-1.5 rounded-full bg-current" /></div><div className="flex flex-col gap-1">
    <div className="flex items-center justify-between gap-4"><p className="text-sm font-bold text-foreground">{event.description || event.action}</p>
      <time className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap bg-muted/50 px-1.5 py-0.5 rounded">
        {format(new Date(event.created_at), "HH:mm '•' dd MMM yy", { locale: ptBR })}</time></div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><User className="h-3 w-3" />
      {event.actor_name || (event.user_id ? "Usuário sem nome disponível" : "Sistema")}</span>
      {rejectionNotes && <span className="inline-flex items-center gap-1 text-destructive font-medium"><Info className="h-3 w-3" />Com feedback</span>}</div>
    {rejectionNotes && <div className="mt-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10 text-xs italic text-destructive/80 whitespace-pre-wrap">"{rejectionNotes}"</div>}
  </div></div>;
}

export function QuoteHistoryTimeline({ quoteId }: QuoteHistoryTimelineProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["quote-history", quoteId],
    queryFn: () => fetchTimeline(quoteId),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <History className="h-4 w-4" /> Nenhum evento registrado.
      </p>
    );
  }

  return (
    <div className="relative pt-2">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
      <div className="space-y-6">
        {data.map((event) => <TimelineEntry key={event.id} event={event} />)}
      </div>
    </div>
  );
}
