import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Database, Server, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

async function fetchSystemHealth() {
  const [dbResult, syncResult] = await Promise.all([
    supabase.from('profiles').select('id').limit(1),
    supabase
      .from('product_sync_logs')
      .select('status')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);
  return {
    db: !dbResult.error,
    sync: !(syncResult.data || []).some((sync) => sync.status === 'failed'),
    lastCheck: new Date().toISOString(),
  };
}

export const SidebarFooterHealth = memo(function SidebarFooterHealth({
  isCollapsed,
}: {
  isCollapsed: boolean;
}) {
  const { isDev } = useAuth();

  const { data: health } = useQuery({
    queryKey: ['system-health-summary'],
    queryFn: fetchSystemHealth,
    enabled: isDev,
    refetchInterval: 1000 * 60 * 2, // 2 minutes
  });

  if (!isDev || !health) return null;

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-3 border-t border-sidebar-border/30 py-4">
        <StatusIcon active={health.db} icon={Database} label="Database Status" />
        <StatusIcon active={health.sync} icon={Server} label="Sync Engine" />
      </div>
    );
  }
  return <ExpandedHealth health={health} />;
});

function ExpandedHealth({ health }: { health: Awaited<ReturnType<typeof fetchSystemHealth>> }) {
  const isAllHealthy = health.db && health.sync;
  return (
    <div className="mt-auto border-t border-sidebar-border/30 px-4 py-4">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Sistema
          </span>
          <Activity
            className={cn(
              'h-3 w-3',
              isAllHealthy ? 'text-green-500' : 'animate-pulse text-yellow-500',
            )}
          />
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
}

function StatusRow({
  active,
  icon,
  label,
  sub,
  err,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  sub: string;
  err: string;
}) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          'rounded-md p-1.5',
          active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500',
        )}
      >
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[11px] font-medium leading-none text-sidebar-foreground/80">
          {label}
        </span>
        <span
          className={cn(
            'mt-0.5 text-[9px]',
            active ? 'text-sidebar-foreground/40' : 'font-medium text-red-500/80',
          )}
        >
          {active ? sub : err}
        </span>
      </div>
    </div>
  );
}

function StatusIcon({ active, icon, label }: { active: boolean; icon: LucideIcon; label: string }) {
  const Icon = icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'rounded-md p-1.5',
              active ? 'bg-green-500/5 text-green-500/40' : 'bg-red-500/10 text-red-500',
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">
            {label}: {active ? 'OK' : 'Falha'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
