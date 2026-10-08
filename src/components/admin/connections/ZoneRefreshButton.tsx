/**
 * ZoneRefreshButton — Onda 14
 *
 * Botão compacto para refresh local de uma zona do hub de Conexões.
 * Invalida apenas as queryKeys relevantes da zona via React Query e
 * opcionalmente dispara um callback (ex: bumpar um signal para componentes
 * que não usam React Query, como ConnectionsOverviewTable).
 *
 * Estado de loading sincroniza com isFetching das queries afetadas.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ZoneRefreshButtonProps {
  /** Lista de queryKeys (prefix match) que serão invalidadas */
  queryKeys: readonly (readonly unknown[])[];
  /** Texto curto do tooltip (ex: "Atualizar zona Saúde") */
  label: string;
  /** Disparado depois da invalidação — útil para bumpar signals locais */
  onRefresh?: () => void;
  /** Mensagem de toast ao concluir; se omitido, não exibe toast */
  successMessage?: string;
  className?: string;
}

function useZoneRefresh({ queryKeys, onRefresh, successMessage }: Pick<ZoneRefreshButtonProps, "queryKeys" | "onRefresh" | "successMessage">) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const mounted = useRef(false);
  const pendingTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(pendingTimer.current); };
  }, []);
  const fetchingCount = useIsFetching({ predicate: (query) => queryKeys.some((target) => target.every((segment, index) => query.queryKey[index] === segment)) });
  const refresh = useCallback(async () => {
    setPending(true);
    try {
      await Promise.all(queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key as unknown[] })));
      if (!mounted.current) return;
      onRefresh?.();
      if (successMessage) toast.success(successMessage, { duration: 2000 });
    } finally {
      if (mounted.current) pendingTimer.current = setTimeout(() => setPending(false), 250);
    }
  }, [queryClient, queryKeys, onRefresh, successMessage]);
  return { isLoading: pending || fetchingCount > 0, refresh };
}

export function ZoneRefreshButton({
  queryKeys,
  label,
  onRefresh,
  successMessage,
  className,
}: ZoneRefreshButtonProps) {
  const { isLoading, refresh } = useZoneRefresh({ queryKeys, onRefresh, successMessage });

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            aria-label={label}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/60 px-2 py-1 text-[11px] text-muted-foreground",
              "hover:text-foreground hover:bg-muted/60 transition-colors",
              "disabled:opacity-60 disabled:cursor-wait",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              className,
            )}
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            <span>{isLoading ? "Atualizando…" : "Atualizar"}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px]">
          <p className="text-xs">{label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Refresca apenas esta zona, sem recarregar o restante da página.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
