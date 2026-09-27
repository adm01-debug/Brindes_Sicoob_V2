import { OrderStatus } from "@/types/orders";

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "rascunho",
  "enviado_gestor",
  "aprovado_gestor",
  "enviado_vendedor",
  "em_producao",
  "em_separacao",
  "em_transporte",
  "entregue",
  "concluido",
  "cancelado",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  rascunho: "Rascunho",
  enviado_gestor: "Enviado ao Gestor",
  aprovado_gestor: "Aprovado pela Singular",
  enviado_vendedor: "Enviado ao Vendedor",
  em_producao: "Em Produção",
  em_separacao: "Em Separação",
  em_transporte: "Em Transporte",
  entregue: "Entregue",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  rascunho: "bg-muted text-muted-foreground border-muted-foreground/30",
  enviado_gestor: "bg-warning/20 text-warning border-warning/30",
  aprovado_gestor: "bg-primary/20 text-primary border-primary/30",
  enviado_vendedor: "bg-primary/15 text-primary/80 border-primary/25",
  em_producao: "bg-blue-100 text-blue-700 border-blue-200",
  em_separacao: "bg-indigo-100 text-indigo-700 border-indigo-200",
  em_transporte: "bg-purple-100 text-purple-700 border-purple-200",
  entregue: "bg-green-100 text-green-700 border-green-200",
  concluido: "bg-green-200 text-green-800 border-green-300",
  cancelado: "bg-destructive/20 text-destructive border-destructive/30",
};

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  rascunho: ["enviado_gestor", "cancelado"],
  enviado_gestor: ["aprovado_gestor", "rascunho", "cancelado"],
  aprovado_gestor: ["enviado_vendedor", "cancelado"],
  enviado_vendedor: ["em_producao", "cancelado"],
  em_producao: ["em_separacao", "cancelado"],
  em_separacao: ["em_transporte", "cancelado"],
  em_transporte: ["entregue", "cancelado"],
  entregue: ["concluido", "cancelado"],
  concluido: [],
  cancelado: [],
};

export const FULFILLMENT_LABELS: Record<string, string> = {
  unfulfilled: "Não Processado",
  partially_fulfilled: "Parcial",
  fulfilled: "Completo",
};

export const FULFILLMENT_COLORS: Record<string, string> = {
  unfulfilled: "bg-warning/20 text-warning border-warning/30",
  partially_fulfilled: "bg-warning/15 text-warning/80 border-warning/25",
  fulfilled: "bg-primary/20 text-primary border-primary/30",
};

export function canTransitionTo(current: string, next: string): boolean {
  if (current === next) return true;
  const validNext = VALID_TRANSITIONS[current as OrderStatus] || [];
  return validNext.includes(next as OrderStatus);
}
