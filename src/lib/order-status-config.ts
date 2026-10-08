import {
  FileEdit, Send, ShieldCheck, UserCheck,
  Settings2, Package, Truck, CheckCircle2,
  CheckCircle, XCircle,
  type LucideIcon
} from "lucide-react";

/**
 * Order Lifecycle Status as defined in technical spec.
 */
export type OrderStatus = 
  | 'rascunho'
  | 'enviado_gestor'
  | 'aprovado_gestor'
  | 'enviado_vendedor'
  | 'em_producao'
  | 'em_separacao'
  | 'em_transporte'
  | 'entregue'
  | 'concluido'
  | 'cancelado';

export interface OrderStatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  badgeClassName: string;
  description: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  rascunho: {
    label: "Rascunho",
    icon: FileEdit,
    color: "hsl(var(--muted-foreground))",
    badgeClassName: "bg-muted text-muted-foreground border-muted",
    description: "Pedido em criação pelo PAC."
  },
  enviado_gestor: {
    label: "Enviado ao Gestor",
    icon: Send,
    color: "hsl(var(--warning))",
    badgeClassName: "bg-warning/10 text-warning border-warning/30",
    description: "Aguardando aprovação do Gestor da Singular."
  },
  aprovado_gestor: {
    label: "Aprovado pelo Gestor",
    icon: ShieldCheck,
    color: "hsl(142, 71%, 45%)",
    badgeClassName: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    description: "Aprovado pela Singular, pronto para o Vendedor."
  },
  enviado_vendedor: {
    label: "Enviado ao Vendedor",
    icon: UserCheck,
    color: "hsl(var(--info))",
    badgeClassName: "bg-info/10 text-info border-info/30",
    description: "Recebido pelo vendedor para processamento."
  },
  em_producao: {
    label: "Em Produção",
    icon: Settings2,
    color: "hsl(38, 92%, 50%)",
    badgeClassName: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    description: "O pedido está sendo fabricado/personalizado."
  },
  em_separacao: {
    label: "Em Separação",
    icon: Package,
    color: "hsl(252, 59%, 48%)",
    badgeClassName: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    description: "Itens sendo conferidos e embalados."
  },
  em_transporte: {
    label: "Em Transporte",
    icon: Truck,
    color: "hsl(199, 89%, 48%)",
    badgeClassName: "bg-sky-500/10 text-sky-600 border-sky-500/30",
    description: "O pedido saiu para entrega."
  },
  entregue: {
    label: "Entregue",
    icon: CheckCircle2,
    color: "hsl(142, 71%, 45%)",
    badgeClassName: "bg-success/10 text-success border-success/30",
    description: "O pedido foi recebido pelo PAC."
  },
  concluido: {
    label: "Concluído",
    icon: CheckCircle,
    color: "hsl(var(--primary))",
    badgeClassName: "bg-primary/10 text-primary border-primary/30",
    description: "Processo finalizado com sucesso."
  },
  cancelado: {
    label: "Cancelado",
    icon: XCircle,
    color: "hsl(var(--destructive))",
    badgeClassName: "bg-destructive/10 text-destructive border-destructive/30",
    description: "O pedido foi cancelado."
  }
};

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_CONFIG[status as OrderStatus]?.label || status;
}
