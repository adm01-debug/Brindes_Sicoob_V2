import React from "react";
import { ArrowRight, Send, CheckCircle2, Clock, AlertTriangle, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface QuoteNextActionBannerProps {
  quoteId: string;
  status: string;
  className?: string;
  onAction?: (action: string) => void;
}

type ActionVariant = "primary" | "warning" | "info" | "success" | "destructive";

interface ActionContent {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  action: () => void;
  variant: ActionVariant;
}

const PENDING_STATUSES = new Set(["pending", "pending_approval", "pending_singular_approval"]);
const APPROVED_STATUSES = new Set(["approved", "approved_singular"]);
const REJECTED_STATUSES = new Set(["rejected", "rejected_singular"]);

function pendingDescription(status: string) {
  if (status === "pending_singular_approval") return "Este orçamento aguarda validação do comprador da Singular.";
  return "Este orçamento possui descontos acima do seu limite e aguarda revisão do gestor.";
}

function rejectedDescription(status: string) {
  if (status === "rejected_singular") return "O comprador da Singular solicitou ajustes neste orçamento.";
  return "Revise os motivos da recusa e faça os ajustes necessários para reenviar.";
}

function resolveActionContent(
  status: string,
  editQuote: () => void,
  onAction?: (action: string) => void,
): ActionContent | null {
  if (status === "draft") return { icon: <FileEdit className="h-5 w-5 text-primary" />, title: "Orçamento em Rascunho", description: "Finalize os detalhes e condições comerciais para enviar ao cliente.", buttonLabel: "Continuar Editando", action: editQuote, variant: "primary" };
  if (PENDING_STATUSES.has(status)) return { icon: <Clock className="h-5 w-5 text-warning" />, title: "Aguardando Aprovação", description: pendingDescription(status), buttonLabel: "Ver Histórico", action: () => onAction?.("view_history"), variant: "warning" };
  if (status === "sent") return { icon: <Send className="h-5 w-5 text-info" />, title: "Enviado ao Cliente", description: "O cliente recebeu a proposta. Você pode acompanhar se ele já visualizou.", buttonLabel: "Compartilhar Link", action: () => onAction?.("share_link"), variant: "info" };
  if (APPROVED_STATUSES.has(status)) return { icon: <CheckCircle2 className="h-5 w-5 text-success" />, title: "Orçamento Aprovado", description: "O orçamento foi aprovado! Converta agora em um pedido para iniciar a produção.", buttonLabel: "Converter em Pedido", action: () => onAction?.("convert_to_order"), variant: "success" };
  if (REJECTED_STATUSES.has(status)) return { icon: <AlertTriangle className="h-5 w-5 text-destructive" />, title: "Orçamento Reprovado", description: rejectedDescription(status), buttonLabel: "Ajustar e Reenviar", action: editQuote, variant: "destructive" };
  return null;
}

const VARIANT_STYLES: Record<ActionVariant, string> = {
  primary: "bg-primary/5 border-primary/20",
  warning: "bg-amber-500/5 border-amber-500/20",
  info: "bg-blue-500/5 border-blue-500/20",
  success: "bg-emerald-500/5 border-emerald-500/20",
  destructive: "bg-destructive/5 border-destructive/20",
};

export function QuoteNextActionBanner({ 
  quoteId, 
  status, 
  className,
  onAction 
}: QuoteNextActionBannerProps) {
  const navigate = useNavigate();
  const content = resolveActionContent(status, () => navigate(`/orcamentos/${quoteId}/editar`), onAction);
  if (!content) return null;

  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl border gap-4 animate-in fade-in slide-in-from-top-2 duration-500",
      VARIANT_STYLES[content.variant],
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
