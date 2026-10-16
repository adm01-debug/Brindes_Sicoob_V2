import { History } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { canRestoreNavigationItem, useNavigationStore } from '@/stores/useNavigationStore';
import { cn } from '@/lib/utils';
import { trackUx } from '@/lib/uxMetrics';

export function NavigationHistoryMenu({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const history = useNavigationStore((state) => state.history);
  const setDirection = useNavigationStore((state) => state.setDirection);
  const entries = history
    .filter((item) => item.key !== location.key && canRestoreNavigationItem(item))
    .slice(0, 8);

  if (entries.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Histórico de páginas visitadas" className={cn('flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-muted/40 hover:text-foreground', className)}>
          <History className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Páginas recentes</DropdownMenuLabel>
        {entries.map((item) => (
          <DropdownMenuItem key={item.key} className="cursor-pointer" onSelect={() => {
            trackUx('nav.history-jump');
            setDirection('backward');
            navigate(`${item.pathname}${item.search}`, { state: item.state });
          }}>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm">{item.title || item.pathname}</span>
              {item.pathname !== item.title && <span className="truncate text-xs text-muted-foreground">{item.pathname}</span>}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
