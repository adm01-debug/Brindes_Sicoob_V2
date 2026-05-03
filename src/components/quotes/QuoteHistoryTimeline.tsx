/**
 * QuoteHistoryTimeline — timeline de eventos do orçamento (mudanças de status, edições, comentários).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, History, User, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface QuoteHistoryTimelineProps {
  quoteId: string;
}

export function QuoteHistoryTimeline({ quoteId }: QuoteHistoryTimelineProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["quote-history", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_history")
        .select("*, profiles(full_name)")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
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
        {data.map((event) => (
          <div key={event.id} className="relative pl-10">
            <div className={cn(
              "absolute left-2 top-0.5 h-4 w-4 rounded-full border-2 bg-background flex items-center justify-center z-10",
              event.action === 'status_change' ? "border-primary" : "border-muted-foreground/30"
            )}>
              <div className="h-1.5 w-1.5 rounded-full bg-current" />
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-foreground">
                  {event.description || event.action}
                </p>
                <time className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap bg-muted/50 px-1.5 py-0.5 rounded">
                  {format(new Date(event.created_at), "HH:mm '•' dd MMM yy", { locale: ptBR })}
                </time>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {(event.profiles as any)?.full_name || "Sistema"}
                </span>
                {event.metadata?.rejection_notes && (
                  <span className="inline-flex items-center gap-1 text-destructive font-medium">
                    <Info className="h-3 w-3" />
                    Com feedback
                  </span>
                )}
              </div>

              {event.metadata?.rejection_notes && (
                <div className="mt-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10 text-xs italic text-destructive/80 whitespace-pre-wrap">
                  "{event.metadata.rejection_notes}"
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

