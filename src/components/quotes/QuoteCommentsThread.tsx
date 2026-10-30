/**
 * QuoteCommentsThread — thread de comentários internos do orçamento.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

interface QuoteCommentsThreadProps {
  quoteId: string;
}

type CommentRow = { id: string; content: string; created_at: string; is_edited: boolean | null };

function CommentsList({ comments, loading }: { comments: CommentRow[] | undefined; loading: boolean }) {
  if (loading) return <Skeleton className="h-20" />;
  if (!comments?.length) return <p className="text-sm text-muted-foreground">Sem comentários ainda.</p>;
  return <ul className="space-y-3">{comments.map((comment) => <li key={comment.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
    <p className="whitespace-pre-wrap">{comment.content}</p><p className="text-xs text-muted-foreground mt-1">
      {new Date(comment.created_at).toLocaleString("pt-BR")}{comment.is_edited && " · editado"}</p>
  </li>)}</ul>;
}

function useQuoteComments(quoteId: string, content: string, clearContent: () => void) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["quote-comments", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quote_comments").select("*").eq("quote_id", quoteId).order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Não autenticado");
      const { error } = await supabase.from("quote_comments").insert({ quote_id: quoteId, user_id: data.user.id, content: content.trim() });
      if (error) throw error;
    },
    onSuccess: () => { clearContent(); void queryClient.invalidateQueries({ queryKey: ["quote-comments", quoteId] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  return { ...query, create };
}

export function QuoteCommentsThread({ quoteId }: QuoteCommentsThreadProps) {
  const [content, setContent] = useState("");
  const { data, isLoading, create } = useQuoteComments(quoteId, content, () => setContent(""));

  return (
    <div className="space-y-4">
      <h3 className="font-medium flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" /> Comentários
      </h3>

      <CommentsList comments={data} loading={isLoading} />

      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Escreva um comentário interno..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <Button
          size="sm"
          onClick={() => create.mutate()}
          disabled={!content.trim() || create.isPending}
          className="self-end"
        >
          <Send className="h-4 w-4 mr-1" /> Enviar
        </Button>
      </div>
    </div>
  );
}
