import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, User, Paperclip, Search, ChevronUp, ChevronDown, Filter } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useOrderComments } from "@/hooks/useOrderExtensions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface OrderCommentsProps {
  orderId: string;
}

export function OrderComments({ orderId }: OrderCommentsProps) {
  const [search, setSearch] = useState("");
  const [hasAttachments, setHasAttachments] = useState(false);
  const [filterInternal, setFilterInternal] = useState<boolean | undefined>(undefined);
  
  const { comments, totalCount, isLoading, addComment, page, setPage, pageSize } = useOrderComments(orderId, { 
    search, 
    hasAttachments,
    isInternal: filterInternal
  });
  
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment.mutate({ content: newComment, isInternal });
    setNewComment("");
  };

  if (isLoading && page === 1) return <div className="h-32 flex items-center justify-center">Carregando comentários...</div>;

  return (
    <Card className="flex flex-col h-[600px]" data-testid="order-chat">
      <CardHeader className="py-3 flex flex-col space-y-3">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Chat do Pedido
          </CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setHasAttachments(prev => !prev)}>
                  {hasAttachments ? "✓ Com Anexos" : "Mostrar apenas com anexos"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterInternal(undefined)}>Todas as mensagens</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterInternal(true)}>Apenas internas</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterInternal(false)}>Apenas públicas</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Buscar mensagens..." 
            className="pl-8 h-8 text-xs" 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden pt-0">
        {totalCount !== undefined && totalCount > pageSize && (
          <div className="flex items-center justify-center gap-2 py-2 border-b">
            <Button 
              variant="ghost" 
              size="xs" 
              className="h-7 text-[10px]" 
              onClick={() => setPage(p => p + 1)}
              disabled={page * pageSize >= totalCount}
            >
              <ChevronUp className="h-3 w-3 mr-1" /> Ver mensagens anteriores
            </Button>
          </div>
        )}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-2 flex flex-col">
            {comments?.map((comment) => (
              <div key={comment.id} className={`flex flex-col ${comment.is_internal ? 'bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30' : ''}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-semibold">{comment.author_role.toUpperCase()}</span>
                    {comment.is_internal && <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">INTERNO</Badge>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(comment.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap pl-8">{comment.content}</p>
                {comment.attachments && (
                  <div className="mt-2 pl-8 flex gap-2">
                    {/* Simplified attachment view */}
                    <span className="text-[10px] text-primary flex items-center gap-1 cursor-pointer hover:underline">
                      <Paperclip className="h-3 w-3" /> Anexo
                    </span>
                  </div>
                )}
              </div>
            ))}
            {(!comments || comments.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8 italic">Nenhum comentário ainda.</p>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="space-y-2 mt-2">
          <div className="flex items-center gap-2 mb-1">
             <label className="text-[10px] flex items-center gap-1 cursor-pointer select-none">
               <input 
                 type="checkbox" 
                 checked={isInternal} 
                 onChange={(e) => setIsInternal(e.target.checked)}
                 className="h-3 w-3"
               />
               Nota interna
             </label>
          </div>
          <div className="relative">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none pr-10 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button 
              type="submit" 
              size="icon" 
              variant="ghost" 
              className="absolute right-2 bottom-2 h-8 w-8 text-primary"
              disabled={addComment.isPending || !newComment.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
