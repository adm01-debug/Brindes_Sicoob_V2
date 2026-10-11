import { History } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNavigationGuardStore } from "@/stores/useNavigationGuardStore";
import { isCriticalPathname } from "@/hooks/useSmartNavigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useNavigationStore } from "@/stores/useNavigationStore";
import { cn } from "@/lib/utils";

interface NavigationHistoryMenuProps {
  className?: string;
}

/**
 * Menu de histórico de navegação: permite "voltar vários passos" indo
 * direto para uma página visitada recentemente, usando o histórico
 * persistido do useNavigationStore (mais recentes primeiro).
 */
export function NavigationHistoryMenu({ className }: NavigationHistoryMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const history = useNavigationStore((s) => s.history);
  const setDirection = useNavigationStore((s) => s.setDirection);

  // Ignora o item 0 (página atual) e limita a lista.
  const entries = history
    .filter((item) => item.pathname !== location.pathname || item.search !== location.search)
    .slice(0, 8);

  if (entries.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Histórico de páginas visitadas"
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-full",
            "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            "transition-all duration-200",
            className,
          )}
        >
          <History className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Páginas recentes</DropdownMenuLabel>
        {entries.map((item, index) => (
          <DropdownMenuItem
            key={`${item.pathname}${item.search}-${index}`}
            className="cursor-pointer"
            onSelect={() => {
              const guard = useNavigationGuardStore.getState();
              void (async () => {
                if (isCriticalPathname(location.pathname) || guard.hasDirty()) {
                  const confirmed = await guard.requestConfirmation();
                  if (!confirmed) return;
                }
                setDirection("backward");
                navigate(item.pathname + item.search);
              })();
            }}
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm">{item.title || item.pathname}</span>
              {item.pathname !== item.title && (
                <span className="truncate text-xs text-muted-foreground">
                  {item.pathname}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
