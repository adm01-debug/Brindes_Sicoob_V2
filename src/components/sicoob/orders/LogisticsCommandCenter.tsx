import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck, MapPin, CheckCircle2, Package, ExternalLink, Globe, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogisticsCommandCenterProps {
  orderId: string;
  trackingCode?: string;
  status: string;
}

export function LogisticsCommandCenter({ orderId, trackingCode, status }: LogisticsCommandCenterProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const copyTracking = () => {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      toast({
        title: "Copiado!",
        description: "Código de rastreio copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const steps = React.useMemo(() => {
    const isLogistic = status === 'logistic';
    const isCompleted = status === 'completed';
    const isConfirmed = ['confirmed', 'logistic', 'completed'].includes(status);
    
    return [
      { 
        label: "Pedido Confirmado", 
        date: isConfirmed ? "Processado" : "Pendente", 
        status: isConfirmed ? "completed" : "current", 
        icon: CheckCircle2 
      },
      { 
        label: "Em Produção", 
        date: isConfirmed ? "Em andamento" : "Aguardando", 
        status: isConfirmed ? (isLogistic || isCompleted ? "completed" : "current") : "pending", 
        icon: Package 
      },
      { 
        label: "Em Trânsito", 
        date: isLogistic ? "Despachado" : (isCompleted ? "Entregue" : "Aguardando"), 
        status: isLogistic ? "current" : (isCompleted ? "completed" : "pending"), 
        icon: Truck 
      },
      { 
        label: "Entrega no PA", 
        date: isCompleted ? "Confirmado" : "Aguardando atualização",
        status: isCompleted ? "completed" : "pending", 
        icon: MapPin 
      },
    ];
  }, [status]);

  return (
    <Card className="border-[1.5px] shadow-sm overflow-hidden bg-slate-50/50">
      <CardHeader className="bg-white border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              Acompanhamento logístico
            </CardTitle>
            <CardDescription className="text-[10px]">Marcos registrados no fluxo do pedido</CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px] gap-1.5 px-2 py-0.5">
            <div className={cn("h-1.5 w-1.5 rounded-full", trackingCode ? "bg-blue-500" : "bg-slate-400")} />
            {trackingCode ? 'Rastreio informado' : 'Sem rastreio'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Timeline Visual */}
        <div className="relative flex justify-between px-2">
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200" />
          {steps.map((step, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center gap-2 group">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                step.status === 'completed' ? "bg-sicoob-green border-sicoob-green text-white" :
                step.status === 'current' ? "bg-white border-blue-500 text-blue-500 animate-bounce" :
                "bg-white border-slate-200 text-slate-400"
              )}>
                <step.icon className="h-4 w-4" />
              </div>
              <div className="text-center w-24">
                <p className={cn("text-[10px] font-bold", step.status === 'pending' ? "text-slate-400" : "text-slate-800")}>
                  {step.label}
                </p>
                <p className="text-[9px] text-muted-foreground">{step.date}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tracking Code Detail */}
        <div className="bg-white p-4 rounded-xl border border-border/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Código de Rastreio</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-bold text-slate-700">{trackingCode || "Não informado"}</p>
                {trackingCode && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyTracking}>
                    {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>
            {trackingCode && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                onClick={() => window.open(`https://www.rastreie.com.br/${encodeURIComponent(trackingCode)}`, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Consultar rastreio
              </Button>
            )}
          </div>

          <div className="flex min-h-28 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <Info className="h-5 w-5 shrink-0 text-blue-600" />
            A localização em tempo real não é fornecida por esta integração. Use o código informado para consultar os eventos publicados pela transportadora.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
