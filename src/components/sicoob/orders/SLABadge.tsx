import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, AlertCircle, History } from "lucide-react";
import { formatDistanceToNow, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

interface SLABadgeProps {
  status: 'normal' | 'warning' | 'critical' | string;
  deadline?: string;
  className?: string;
  showCountdown?: boolean;
}

export const SLABadge = ({ status, deadline, className, showCountdown = true }: SLABadgeProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!deadline || !showCountdown) return;

    const updateTimer = () => {
      try {
        const target = parseISO(deadline);
        const now = new Date();
        
        // Simulação de cálculo de percentual baseado no tempo
        const creationDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Exemplo: criado há 24h
        const totalSlaTime = target.getTime() - creationDate.getTime();
        const elapsed = now.getTime() - creationDate.getTime();
        const calculatedPercent = Math.min(Math.max((elapsed / totalSlaTime) * 100, 0), 100);
        setPercent(calculatedPercent);

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
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [deadline, showCountdown]);

  const config = {
    normal: {
      label: "SLA Normal",
      icon: Clock,
      classes: "bg-sicoob-green/10 text-sicoob-green border-sicoob-green/20",
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
    <div className={cn("flex flex-col gap-1 min-w-[140px]", className)}>
      <div className="flex items-center justify-between">
        <Badge 
          variant="outline" 
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 font-bold text-[9px] uppercase tracking-wider", 
            current.classes
          )}
        >
          <Icon className="h-3 w-3" />
          <span>{current.label}</span>
        </Badge>
        {deadline && showCountdown && (
          <span className={cn(
            "text-[8px] font-bold",
            status === 'critical' ? "text-destructive" : "text-muted-foreground"
          )}>
            {percent.toFixed(0)}%
          </span>
        )}
      </div>
      
      {deadline && showCountdown && (
        <div className="space-y-1">
          <Progress value={percent} className="h-1" indicatorClassName={cn(
            status === 'critical' ? "bg-destructive" : status === 'warning' ? "bg-amber-500" : "bg-sicoob-green"
          )} />
          <span className={cn(
            "text-[8px] font-medium px-1 flex items-center gap-1",
            status === 'critical' ? "text-destructive font-bold" : "text-muted-foreground"
          )}>
            {timeLeft}
          </span>
        </div>
      )}
    </div>
  );
};
