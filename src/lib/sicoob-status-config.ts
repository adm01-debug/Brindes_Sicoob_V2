import { Package, Truck, CheckCircle2, XCircle, Settings2, type LucideIcon } from "lucide-react";

export type SicoobFulfillmentStatus = 
  | 'in_production' 
  | 'in_separation' 
  | 'in_transit' 
  | 'delivered' 
  | 'completed' 
  | 'cancelled';

export interface StatusConfig {
  label: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive" | "success" | "warning";
  statusToken: string;
}

export const SICOOB_STATUS_CONFIG: Record<SicoobFulfillmentStatus, StatusConfig> = {
  in_production: {
    label: "Em Produção",
    icon: Settings2,
    colorClass: "text-status-production",
    bgClass: "bg-status-production/10",
    badgeVariant: "warning",
    statusToken: "production"
  },
  in_separation: {
    label: "Em Separação",
    icon: Package,
    colorClass: "text-status-separation",
    bgClass: "bg-status-separation/10",
    badgeVariant: "secondary",
    statusToken: "separation"
  },
  in_transit: {
    label: "Em Trânsito",
    icon: Truck,
    colorClass: "text-status-transit",
    bgClass: "bg-status-transit/10",
    badgeVariant: "default",
    statusToken: "transit"
  },
  delivered: {
    label: "Entregue",
    icon: CheckCircle2,
    colorClass: "text-status-delivered",
    bgClass: "bg-status-delivered/10",
    badgeVariant: "success",
    statusToken: "delivered"
  },
  completed: {
    label: "Concluído",
    icon: CheckCircle2,
    colorClass: "text-status-completed",
    bgClass: "bg-status-completed/10",
    badgeVariant: "outline",
    statusToken: "completed"
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    colorClass: "text-status-cancelled",
    bgClass: "bg-status-cancelled/10",
    badgeVariant: "destructive",
    statusToken: "cancelled"
  }
};

export function getStatusConfig(status: string | null | undefined): StatusConfig {
  const normalized = (status || 'in_production') as SicoobFulfillmentStatus;
  return SICOOB_STATUS_CONFIG[normalized] || SICOOB_STATUS_CONFIG.in_production;
}
