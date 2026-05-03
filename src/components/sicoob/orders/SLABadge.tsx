import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface SLABadgeProps {
  status: 'normal' | 'warning' | 'critical' | string;
  deadline?: string;
  className?: string;
}

export const SLABadge = ({ status, deadline, className }: SLABadgeProps) => {
  const config = {
    normal: {
      label: "Dentro do Prazo",
      classes: "bg-success/10 text-success border-success/20",
    },
    warning: {
      label: "Prazo Próximo",
      classes: "bg-warning/10 text-warning border-warning/20",
    },
    critical: {
      label: "Prazo Excedido",
      classes: "bg-destructive/10 text-destructive border-destructive/20",
    }
  };

  const current = config[status as keyof typeof config] || config.normal;

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1.5 px-2 py-0.5 font-medium", current.classes, className)}>
      <Clock className="h-3.5 w-3.5" />
      <span>{current.label}</span>
      {deadline && (
        <span className="ml-1 text-[10px] opacity-70">
          ({new Date(deadline).toLocaleDateString('pt-BR')})
        </span>
      )}
    </Badge>
  );
};
