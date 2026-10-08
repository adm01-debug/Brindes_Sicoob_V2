import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle, 
  FileText,
  Send,
  Ban,
  Loader2,
  type LucideIcon 
} from "lucide-react";

const INFO_STATUS = "bg-info/10 text-info border border-info/20";
const SUCCESS_STATUS = "bg-success/10 text-success border border-success/20";
const DESTRUCTIVE_STATUS = "bg-destructive/10 text-destructive border border-destructive/20";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        // Quote statuses
        draft: "bg-muted text-muted-foreground",
        pending: "bg-warning/10 text-warning border border-warning/20",
        sent: INFO_STATUS,
        approved: SUCCESS_STATUS,
        rejected: DESTRUCTIVE_STATUS,
        expired: "bg-muted text-muted-foreground border border-border",
        
        // Order statuses
        processing: INFO_STATUS,
        shipped: "bg-primary/10 text-primary border border-primary/20",
        delivered: SUCCESS_STATUS,
        cancelled: DESTRUCTIVE_STATUS,
        
        // Generic statuses
        active: SUCCESS_STATUS,
        inactive: "bg-muted text-muted-foreground border border-border",
        warning: "bg-warning/10 text-warning border border-warning/20",
        error: DESTRUCTIVE_STATUS,
        info: INFO_STATUS,
        success: SUCCESS_STATUS,
        
        // Loading
        loading: "bg-muted text-muted-foreground animate-pulse",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        default: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      status: "draft",
      size: "default",
    },
  }
);

const statusIcons: Record<string, LucideIcon> = {
  draft: FileText,
  pending: Clock,
  sent: Send,
  approved: CheckCircle,
  rejected: XCircle,
  expired: Ban,
  processing: Loader2,
  shipped: Send,
  delivered: CheckCircle,
  cancelled: XCircle,
  active: CheckCircle,
  inactive: Ban,
  warning: AlertCircle,
  error: XCircle,
  info: AlertCircle,
  success: CheckCircle,
  loading: Loader2,
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  pending: "Pendente",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  expired: "Expirado",
  processing: "Processando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  active: "Ativo",
  inactive: "Inativo",
  warning: "Atenção",
  error: "Erro",
  info: "Info",
  success: "Sucesso",
  loading: "Carregando",
};

type StatusVariant = NonNullable<VariantProps<typeof statusBadgeVariants>["status"]>;

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: StatusVariant;
  label?: string;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ 
  status, 
  label, 
  showIcon = true, 
  size,
  className 
}: StatusBadgeProps) {
  const Icon = statusIcons[status];
  const displayLabel = label || statusLabels[status];
  const isLoading = status === "loading" || status === "processing";

  return (
    <span 
      className={cn(statusBadgeVariants({ status, size }), className)}
      role="status"
      aria-label={displayLabel}
    >
      {showIcon && Icon && (
        <Icon 
          className={cn(
            "h-3 w-3", 
            isLoading && "animate-spin"
          )} 
          aria-hidden="true" 
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}

// Utility function to map any status string to a valid status
export function mapToStatus(status: string): keyof typeof statusLabels {
  const normalized = status.toLowerCase().replace(/[_-]/g, "");
  
  const mappings: Record<string, keyof typeof statusLabels> = {
    rascunho: "draft",
    pendente: "pending",
    aguardando: "pending",
    enviado: "sent",
    aprovado: "approved",
    rejeitado: "rejected",
    expirado: "expired",
    processando: "processing",
    emprocessamento: "processing",
    entregue: "delivered",
    cancelado: "cancelled",
    ativo: "active",
    inativo: "inactive",
  };

  return mappings[normalized] || (statusLabels[status] ? status as keyof typeof statusLabels : "info");
}
