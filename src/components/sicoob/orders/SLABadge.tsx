import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, AlertCircle, History } from "lucide-react";
import { formatDistanceToNow, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SLABadgeProps {
  status: 'normal' | 'warning' | 'critical' | string;
  deadline?: string;
  className?: string;
  showCountdown?: boolean;
}

export const SLABadge = ({ status, deadline, className, showCountdown = true }: SLABadgeProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!deadline || !showCountdown) return;

    const updateTimer = () => {
      try {
        const target = parseISO(deadline);
        const now = new Date();
        
        if (isAfter(now, target)) {
          setTimeLeft(`Excedido há ${formatDistanceToNow(target, { locale: ptBR })}`);
          return;
        }

        setTimeLeft(`Restam ${formatDistanceToNow(target, { locale: ptBR })}`);
      } catch (e) {
        setTimeLeft("");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, [deadline, showCountdown]);

  const config = {
    normal: {
      label: "SLA Normal",
      icon: Clock,
      classes: "bg-sicoob-green/10 text-sicoob-green border-sicoob-green/20 shadow-sm",
    },
    warning: {
      label: "Atenção (SLA)",
      icon: AlertCircle,
      classes: "bg-amber-100 text-amber-700 border-amber-200 animate-pulse",
    },
    critical: {
      label: "Crítico (SLA)",
      icon: History,
      classes: "bg-destructive/10 text-destructive border-destructive/20 ring-1 ring-destructive/30",
    }
  };

  const current = config[status as keyof typeof config] || config.normal;
  const Icon = current.icon;

  return (
    <div className="flex flex-col gap-1">
      <Badge 
        variant="outline" 
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wider", 
          current.classes, 
          className
        )}
      >
        <Icon className="h-3 w-3" />
        <span>{current.label}</span>
      </Badge>
      
      {deadline && showCountdown && (
        <span className={cn(
          "text-[9px] font-medium px-1 flex items-center gap-1",
          status === 'critical' ? "text-destructive" : "text-muted-foreground"
        )}>
          {timeLeft}
        </span>
      )}
    </div>
  );
};
