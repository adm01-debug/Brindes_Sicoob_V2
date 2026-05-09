import React from "react";
import { 
  ArrowRight, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileEdit,
  ExternalLink,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface QuoteNextActionBannerProps {
  quoteId: string;
  status: string;
  className?: string;
  onAction?: (action: string) => void;
}

export function QuoteNextActionBanner({ 
  quoteId, 
  status, 
  className,
  onAction 
}: QuoteNextActionBannerProps) {
  const navigate = useNavigate();

  const getActionContent = () => {
    switch (status) {
      case "draft":
        return {
          icon: <FileEdit className="h-5 w-5 text-primary" />,
          title: "Orçamento em Rascunho",
          description: "Finalize os detalhes e condições comerciais para enviar ao cliente.",
          buttonLabel: "Continuar Editando",
          action: () => navigate(`/orcamentos/${quoteId}/editar`),
          variant: "primary"
        };
      case "pending":
      case "pending_approval":
      case "pending_singular_approval":
        return {
          icon: <Clock className="h-5 w-5 text-warning" />,
          title: "Aguardando Aprovação",
          description: status === "pending_singular_approval" 
            ? "Este orçamento aguarda validação do comprador da Singular."
            : "Este orçamento possui descontos acima do seu limite e aguarda revisão do gestor.",
          buttonLabel: "Ver Histórico",
          action: () => onAction?.("view_history"),
          variant: "warning"
        };
      case "sent":
        return {
          icon: <Send className="h-5 w-5 text-info" />,
          title: "Enviado ao Cliente",
          description: "O cliente recebeu a proposta. Você pode acompanhar se ele já visualizou.",
          buttonLabel: "Compartilhar Link",
          action: () => onAction?.("share_link"),
          variant: "info"
        };
      case "approved":
      case "approved_singular":
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-success" />,
          title: "Orçamento Aprovado",
          description: "O orçamento foi aprovado! Converta agora em um pedido para iniciar a produção.",
          buttonLabel: "Converter em Pedido",
          action: () => onAction?.("convert_to_order"),
          variant: "success"
        };
      case "rejected":
      case "rejected_singular":
        return {
          icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
          title: "Orçamento Reprovado",
          description: status === "rejected_singular"
            ? "O comprador da Singular solicitou ajustes neste orçamento."
            : "Revise os motivos da recusa e faça os ajustes necessários para reenviar.",
          buttonLabel: "Ajustar e Reenviar",
          action: () => navigate(`/orcamentos/${quoteId}/editar`),
          variant: "destructive"
        };
      default:
        return null;
    }
  };

  const content = getActionContent();
  if (!content) return null;

  const variantStyles = {
    primary: "bg-primary/5 border-primary/20",
    warning: "bg-amber-500/5 border-amber-500/20",
    info: "bg-blue-500/5 border-blue-500/20",
    success: "bg-emerald-500/5 border-emerald-500/20",
    destructive: "bg-destructive/5 border-destructive/20",
  };

  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl border gap-4 animate-in fade-in slide-in-from-top-2 duration-500",
      variantStyles[content.variant as keyof typeof variantStyles],
      className
    )}>
      <div className="flex items-center gap-4 text-center sm:text-left">
        <div className={cn(
          "p-2.5 rounded-xl hidden sm:block",
          content.variant === "primary" && "bg-primary/10",
          content.variant === "warning" && "bg-amber-500/10",
          content.variant === "info" && "bg-blue-500/10",
          content.variant === "success" && "bg-emerald-500/10",
          content.variant === "destructive" && "bg-destructive/10",
        )}>
          {content.icon}
        </div>
        <div>
          <h4 className="font-display font-bold text-sm text-foreground">{content.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{content.description}</p>
        </div>
      </div>
      <Button 
        onClick={content.action}
        size="sm"
        className={cn(
          "w-full sm:w-auto gap-2 group",
          content.variant === "success" && "bg-emerald-600 hover:bg-emerald-700",
          content.variant === "warning" && "bg-amber-600 hover:bg-amber-700",
        )}
      >
        {content.buttonLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Button>
    </div>
  );
}
