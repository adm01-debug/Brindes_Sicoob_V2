import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, ShieldCheck, Database, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const SidebarFooterHealth = memo(function SidebarFooterHealth({ isCollapsed }: { isCollapsed: boolean }) {
  const { isDev } = useAuth();

  const { data: health } = useQuery({
    queryKey: ["system-health-summary"],
    queryFn: async () => {
      // Parallel check for core services
      const [dbResult, syncResult] = await Promise.all([
        supabase.from("profiles").select("id").limit(1),
        supabase.from("product_sync_logs").select("status").order("created_at", { ascending: false }).limit(5)
      ]);

      const lastSyncs = syncResult.data || [];
      const hasSyncFailures = lastSyncs.some(s => s.status === 'failed');

      return {
        db: !dbResult.error,
        sync: !hasSyncFailures,
        lastCheck: new Date().toISOString()
      };
    },
    enabled: isDev,
    refetchInterval: 1000 * 60 * 2, // 2 minutes
  });

  if (!isDev || !health) return null;

  const isAllHealthy = health.db && health.sync;

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 border-t border-sidebar-border/30 gap-3">
        <StatusIcon 
          active={health.db} 
          icon={Database} 
          label="Database Status" 
        />
        <StatusIcon 
          active={health.sync} 
          icon={Server} 
          label="Sync Engine" 
        />
      </div>
    );
  }

  return (
    <div className="mt-auto px-4 py-4 border-t border-sidebar-border/30">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">Sistema</span>
          <Activity className={cn("h-3 w-3", isAllHealthy ? "text-green-500" : "text-yellow-500 animate-pulse")} />
        </div>
        
        <div className="space-y-1.5">
          <StatusRow 
            active={health.db} 
            icon={Database} 
            label="Banco de Dados" 
            sub="Conectado"
            err="Erro de Conexão"
          />
          <StatusRow 
            active={health.sync} 
            icon={Server} 
            label="Sincronização" 
            sub="Operacional"
            err="Falha Recente"
          />
        </div>
      </div>
    </div>
  );
});

function StatusRow({ active, icon: Icon, label, sub, err }: { active: boolean; icon: any; label: string; sub: string; errText?: string; err: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn(
        "p-1.5 rounded-md",
        active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
      )}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-medium leading-none text-sidebar-foreground/80 truncate">{label}</span>
        <span className={cn("text-[9px] mt-0.5", active ? "text-sidebar-foreground/40" : "text-red-500/80 font-medium")}>
          {active ? sub : err}
        </span>
      </div>
    </div>
  );
}

function StatusIcon({ active, icon: Icon, label }: { active: boolean; icon: any; label: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "p-1.5 rounded-md",
            active ? "bg-green-500/5 text-green-500/40" : "bg-red-500/10 text-red-500"
          )}>
            <Icon className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">{label}: {active ? 'OK' : 'Falha'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
