import { useState } from "react";
import { useOrderComments } from "@/hooks/useOrderExtensions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, ShieldAlert, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface OrderCommentsTabProps {
  orderId: string;
}

export const OrderCommentsTab = ({ orderId }: OrderCommentsTabProps) => {
  const { profile, isSupervisorOrAbove } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const { comments, addComment, isLoading } = useOrderComments(orderId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    addComment.mutate({
      content: newComment,
      isInternal: isInternal
    }, {
      onSuccess: () => {
        setNewComment("");
        setIsInternal(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-[1.5px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comunicação do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Textarea
                placeholder="Escreva uma mensagem... Use @ para mencionar gestores."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px] resize-none border-muted-foreground/20 focus-visible:ring-sicoob-green pr-12"
              />
              {newComment.includes("@") && (
                <div className="absolute bottom-full left-0 w-48 bg-white border rounded-md shadow-lg z-50 mb-1 p-1">
                  <p className="text-[9px] font-bold text-muted-foreground px-2 py-1 uppercase">Mencionar Gestor</p>
                  <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs gap-2" onClick={() => setNewComment(newComment.split("@")[0] + "@Admin Central ")}>
                    <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px]">AC</AvatarFallback></Avatar>
                    Admin Central
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              {isSupervisorOrAbove ? (
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="internal-mode" 
                    checked={isInternal} 
                    onCheckedChange={setIsInternal}
                    className="data-[state=checked]:bg-amber-500"
                  />
                  <Label htmlFor="internal-mode" className="text-xs cursor-pointer flex items-center gap-1.5 text-muted-foreground">
                    {isInternal ? (
                      <>
                        <ShieldAlert className="h-3 w-3 text-amber-500" />
                        <span className="text-amber-600 font-medium">Nota Interna (Apenas Gestão)</span>
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        <span>Comentário Público</span>
                      </>
                    )}
                  </Label>
                </div>
              ) : <div />}
              
              <Button 
                type="submit" 
                size="sm" 
                className="bg-sicoob-green hover:bg-sicoob-green-dark text-white gap-2"
                disabled={!newComment.trim() || addComment.isPending}
              >
                {addComment.isPending ? "Enviando..." : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Carregando mensagens...</div>
        ) : comments?.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/10">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum comentário registrado ainda.</p>
          </div>
        ) : (
          comments?.map((comment) => (
            <div 
              key={comment.id} 
              className={cn(
                "group flex flex-col gap-2 p-4 rounded-xl border transition-all hover:shadow-sm",
                comment.is_internal 
                  ? "bg-amber-50/50 border-amber-200/60" 
                  : "bg-white border-muted/60"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={comment.author?.avatar_url} />
                    <AvatarFallback className="bg-muted text-[10px]">
                      {comment.author?.full_name?.substring(0, 2).toUpperCase() || "US"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {comment.author?.full_name || "Usuário Sicoob"}
                      </span>
                      {comment.is_internal && (
                        <Badge variant="outline" className="h-5 bg-amber-100 text-amber-700 border-amber-200 text-[10px] gap-1 px-1.5 py-0">
                          <ShieldAlert className="h-3 w-3" />
                          INTERNO
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(comment.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pl-11 pr-2">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
