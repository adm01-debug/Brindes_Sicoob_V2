import { ShieldAlert } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isDevOnlyPath, isAdminOnlyPath } from '@/lib/navigation/restricted-routes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RestrictedRouteNoticeProps {
  isCollapsed: boolean;
}

function isRouteBlocked(isDevRoute: boolean, isAdminRoute: boolean, isAdmin: boolean) {
  if (isDevRoute) return true;
  return isAdminRoute && !isAdmin;
}

/**
 * Aviso contextual exibido no topo do Sidebar quando o usuário tenta
 * acessar (via URL direta, histórico ou link colado) uma rota técnica
 * para a qual não tem permissão.
 *
 * - Vendedor / Agente em rota dev/admin → mostra alerta + ação "Solicitar acesso".
 * - No modo colapsado, vira só o ícone com tooltip explicativo.
 * - Dev nunca vê (tem acesso).
 */
export function RestrictedRouteNotice({ isCollapsed }: RestrictedRouteNoticeProps) {
  const location = useLocation();
  const { isAdmin, isDev } = useAuth();
  const path = location.pathname;

  const isDevRoute = isDevOnlyPath(path);
  const isAdminRoute = !isDevRoute && isAdminOnlyPath(path);

  // Dev sempre tem acesso; nada a avisar.
  if (isDev) return null;

  // Rota técnica: precisa de dev. Bloqueia tanto vendedor quanto admin.
  // Rota admin: bloqueia só vendedor.
  const blocked = isRouteBlocked(isDevRoute, isAdminRoute, isAdmin);
  if (!blocked) return null;

  const requiredRole = isDevRoute ? 'dev' : 'admin';
  const description = isDevRoute
    ? 'Esta área é exclusiva da equipe técnica (dev). Você não tem permissão para abri-la.'
    : 'Esta área exige perfil administrativo. Você não tem permissão para abri-la.';

  if (isCollapsed) {
    return <CollapsedRestrictedNotice description={description} requiredRole={requiredRole} />;
  }
  return <ExpandedRestrictedNotice description={description} requiredRole={requiredRole} />;
}

interface NoticeViewProps {
  description: string;
  requiredRole: string;
}

function CollapsedRestrictedNotice({ description, requiredRole }: NoticeViewProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="status"
            aria-label={`Rota restrita: ${description}`}
            className={cn(
              'mx-auto my-2 flex h-8 w-8 items-center justify-center rounded-md',
              'border border-destructive/30 bg-destructive/10 text-destructive',
            )}
          >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <p className="text-xs font-semibold">Rota restrita</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
          <RequiredRole role={requiredRole} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ExpandedRestrictedNotice({ description, requiredRole }: NoticeViewProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="sidebar-restricted-notice"
      className="mx-2 my-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight text-destructive">Rota restrita</p>
          <p className="mt-0.5 leading-snug text-destructive/80">{description}</p>
          <RequiredRole role={requiredRole} />
        </div>
      </div>
    </div>
  );
}

function RequiredRole({ role }: { role: string }) {
  return (
    <p className="mt-1 text-[11px]">
      Papel exigido: <span className="font-mono font-semibold">{role}</span>
    </p>
  );
}
