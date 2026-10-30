import { useEffect, useMemo } from "react";
import { Database, AlertTriangle, Minus, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCredentialsSourceFilter,
  resolveSource,
  type CredentialSource,
} from "./CredentialsSourceFilterContext";
import type { SecretStatus } from "@/hooks/useSecretsManager";

interface Props {
  secrets: SecretStatus[];
  className?: string;
}

function sourceCounts(secrets: SecretStatus[]) {
  const counts = { all: secrets.length, db: 0, env: 0, none: 0 };
  for (const secret of secrets) counts[resolveSource(secret)] += 1;
  return counts;
}

type SourceCounts = ReturnType<typeof sourceCounts>;

function SourceChips({ counts, filter, setFilter }: { counts: SourceCounts; filter: CredentialSource; setFilter: (source: CredentialSource) => void }) {
  const chips = [
    { value: "all" as const, label: "Todas", count: counts.all, icon: LayoutGrid, activeCls: "border-primary bg-primary/10 text-primary" },
    { value: "db" as const, label: "Banco", count: counts.db, icon: Database, activeCls: "border-success/50 bg-success/15 text-success" },
    { value: "env" as const, label: "Em ENV", count: counts.env, icon: AlertTriangle, activeCls: "border-warning/50 bg-warning/15 text-warning" },
    { value: "none" as const, label: "Não configuradas", count: counts.none, icon: Minus, activeCls: "border-border bg-muted text-foreground" },
  ];
  return <>{chips.map((chip) => { const active = filter === chip.value; const Icon = chip.icon; return <button key={chip.value} type="button" onClick={() => setFilter(chip.value)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors", active ? chip.activeCls : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground")} aria-pressed={active}><Icon className="h-3 w-3" />{chip.label}<span className={cn("tabular-nums", active ? "" : "opacity-70")}>({chip.count})</span></button>; })}</>;
}

export function CredentialsSourceFilter({ secrets, className }: Props) {
  const { filter, setFilter } = useCredentialsSourceFilter();

  const counts = useMemo(() => sourceCounts(secrets), [secrets]);

  // Shift+E shortcut to toggle env/all
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "E" || e.key === "e")) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setFilter(filter === "env" ? "all" : "env");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filter, setFilter]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-medium text-muted-foreground mr-1">Origem das credenciais:</span>
      <SourceChips counts={counts} filter={filter} setFilter={setFilter} />
      {filter === "env" && counts.env > 0 && (
        <span className="text-[11px] text-warning ml-1">↳ recomendado migrar para o banco</span>
      )}
      <span className="ml-auto text-[10px] text-muted-foreground/70 hidden md:inline">
        Atalho: <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">Shift+E</kbd>
      </span>
    </div>
  );
}
