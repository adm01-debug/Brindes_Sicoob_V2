
import React from 'react';
import { 
  CheckCircle2, 
  TrendingDown, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  Truck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type StockStatus } from '@/types/stock';

export const STATUS_CONFIG: Record<StockStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: React.ReactNode;
}> = {
  in_stock: { 
    label: 'Em Estoque', 
    color: 'text-success',
    bgColor: 'bg-success/10 border-success/20',
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  low_stock: { 
    label: 'Baixo', 
    color: 'text-warning',
    bgColor: 'bg-warning/10 border-warning/20',
    icon: <TrendingDown className="h-4 w-4" />
  },
  critical: { 
    label: 'Crítico', 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 border-destructive/20',
    icon: <AlertTriangle className="h-4 w-4" />
  },
  out_of_stock: { 
    label: 'Esgotado', 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 border-destructive/20',
    icon: <XCircle className="h-4 w-4" />
  },
  overstocked: { 
    label: 'Excesso', 
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/20',
    icon: <TrendingUp className="h-4 w-4" />
  },
  incoming: { 
    label: 'Chegando', 
    color: 'text-primary/80',
    bgColor: 'bg-primary/10 border-primary/15',
    icon: <Truck className="h-4 w-4" />
  },
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("gap-1", config.bgColor, config.color)}>
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
    </Badge>
  );
}

export function ColorSwatch({ hex, name }: { hex?: string; name?: string }) {
  return (
    <div className="flex items-center gap-2">
      {hex ? (
        <div 
          className="h-5 w-5 rounded-full border border-border shadow-sm"
          style={{ backgroundColor: hex }}
          title={name}
        />
      ) : (
        <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/50" />
      )}
      <span className="text-sm">{name || 'Sem cor'}</span>
    </div>
  );
}

export function StockProgressBar({ current, min }: { current: number; min: number; max?: number }) {
  const percentage = min > 0 ? Math.min((current / min) * 100, 100) : (current > 0 ? 100 : 0);
  
  const progressColor = 
    current <= 0 ? 'bg-destructive' :
    current <= min * 0.25 ? 'bg-destructive' :
    current <= min ? 'bg-warning' :
    'bg-success';

  const statusLabel = 
    current <= 0 ? 'Esgotado' :
    current <= min * 0.25 ? 'Crítico' :
    current <= min ? 'Baixo' :
    'OK';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-28 cursor-help space-y-0.5">
            <Progress 
              value={percentage} 
              className={cn("h-2", progressColor)} 
            />
            <div className="flex justify-between">
              <span className={cn("text-[9px] tabular-nums", percentage <= 25 ? "text-destructive" : percentage <= 100 ? "text-warning" : "text-success")}>
                {Math.round(percentage)}%
              </span>
              <span className="text-[9px] text-muted-foreground">{statusLabel}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p><span className="font-semibold">{Math.round(percentage)}%</span> do estoque mínimo</p>
            <p className="text-muted-foreground">
              Atual: <strong>{current.toLocaleString('pt-BR')}</strong> / Mínimo: <strong>{min.toLocaleString('pt-BR')}</strong> un.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
