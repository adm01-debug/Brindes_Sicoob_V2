import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck, MapPin, CheckCircle2, Clock, Package, ExternalLink, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogisticsCommandCenterProps {
  orderId: string;
  trackingCode?: string;
  status: string;
}

export function LogisticsCommandCenter({ orderId, trackingCode, status }: LogisticsCommandCenterProps) {
  const steps = [
    { label: "Pedido Confirmado", date: "10 Mai, 09:00", status: "completed", icon: CheckCircle2 },
    { label: "Aguardando Produção", date: "10 Mai, 14:20", status: "completed", icon: Package },
    { label: "Em Trânsito", date: "11 Mai, 10:00", status: "current", icon: Truck },
    { label: "Entrega no PA", date: "Previsão: 13 Mai", status: "pending", icon: MapPin },
  ];

  return (
    <Card className="border-[1.5px] shadow-sm overflow-hidden bg-slate-50/50">
      <CardHeader className="bg-white border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              Central de Comando Logístico
            </CardTitle>
            <CardDescription className="text-[10px]">Rastreamento em tempo real e geolocalização</CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px] gap-1.5 px-2 py-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            FREIGHT SYNC ACTIVE
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
              <p className="font-mono text-sm font-bold text-slate-700">{trackingCode || "SCB-998122-BR"}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2">
              <ExternalLink className="h-3.5 w-3.5" /> Site da Transportadora
            </Button>
          </div>

          {/* Map Simulation */}
          <div className="relative h-48 w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-200 shadow-inner group">
             <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/-47.8821,-15.7942,5,0,0/600x300?access_token=pk.mock')] bg-cover opacity-60 group-hover:scale-105 transition-transform duration-10000" />
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                   <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-25" />
                   <motion.div 
                     animate={{ y: [0, -10, 0] }}
                     transition={{ repeat: Infinity, duration: 2 }}
                     className="bg-white p-2.5 rounded-full shadow-2xl border-2 border-blue-600 relative z-10"
                   >
                     <Truck className="h-6 w-6 text-blue-600" />
                   </motion.div>
                </div>
             </div>
             
             {/* Radar Scan Effect */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-blue-500/20 rounded-full animate-pulse" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-blue-500/10 rounded-full animate-pulse delay-75" />
             
             <div className="absolute top-2 right-2 bg-sicoob-green text-white text-[7px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                <div className="h-1 w-1 bg-white rounded-full animate-ping" /> GPS SIGNAL: STRONG
             </div>
             
             <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-[8px] px-2 py-1.5 rounded backdrop-blur-md border border-white/10 flex justify-between items-center">
                <span>Coord: -15.7942, -47.8821</span>
                <span className="font-bold">VEL: 82 KM/H</span>
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
