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
  startedAt?: string;
  className?: string;
  showCountdown?: boolean;
}

function showSlaDetails(deadline: string | undefined, showCountdown: boolean) {
  return Boolean(deadline) && showCountdown;
}

function progressClass(status: string) {
  if (status === 'critical') return "bg-destructive";
  if (status === 'warning') return "bg-amber-500";
  return "bg-sicoob-green";
}

function SlaCountdown({ status, percent, timeLeft, showProgress }: { status: string; percent: number; timeLeft: string; showProgress: boolean }) {
  const critical = status === 'critical';
  return (
    <div className="space-y-1">
      {showProgress && <Progress value={percent} className="h-1" indicatorClassName={progressClass(status)} />}
      <span className={cn(
        "text-[8px] font-medium px-1 flex items-center gap-1",
        critical ? "text-destructive font-bold" : "text-muted-foreground",
      )}>
        {timeLeft}
      </span>
    </div>
  );
}

export const SLABadge = ({ status, deadline, startedAt, className, showCountdown = true }: SLABadgeProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!deadline || !showCountdown) return;

    const updateTimer = () => {
      try {
        const target = parseISO(deadline);
        const now = new Date();
        
        const started = startedAt ? parseISO(startedAt) : null;
        const totalSlaTime = started ? target.getTime() - started.getTime() : 0;
        const elapsed = started ? now.getTime() - started.getTime() : 0;
        setPercent(totalSlaTime > 0 ? Math.min(Math.max((elapsed / totalSlaTime) * 100, 0), 100) : 0);

        if (isAfter(now, target)) {
          setTimeLeft(`Excedido há ${formatDistanceToNow(target, { locale: ptBR })}`);
          return;
        }

        setTimeLeft(`Restam ${formatDistanceToNow(target, { locale: ptBR })}`);
      } catch {
        setTimeLeft("");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [deadline, startedAt, showCountdown]);

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
  const displayDetails = showSlaDetails(deadline, showCountdown);

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
        {displayDetails && startedAt && (
          <span className={cn(
            "text-[8px] font-bold",
            status === 'critical' ? "text-destructive" : "text-muted-foreground"
          )}>
            {percent.toFixed(0)}%
          </span>
        )}
      </div>
      
      {displayDetails && <SlaCountdown status={status} percent={percent} timeLeft={timeLeft} showProgress={Boolean(startedAt)} />}
    </div>
  );
};
