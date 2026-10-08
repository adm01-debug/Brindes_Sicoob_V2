import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useSecretsManager, type RotationHistoryEntry } from "@/hooks/useSecretsManager";
import { History, RefreshCw, Save, ArrowRight, Clock, User } from "lucide-react";
import { formatMaskedSuffix } from "@/lib/masked-suffix";

interface Props {
  secretName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "há instantes";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const d = Math.floor(hr / 24);
  return `há ${d}d`;
}

function ActionBadge({ type }: { type: "set" | "rotate" }) {
  if (type === "rotate") {
    return (
      <Badge variant="secondary" className="gap-1 font-medium">
        <RefreshCw className="h-3 w-3" /> Rotação
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 font-medium">
      <Save className="h-3 w-3" /> Salvar
    </Badge>
  );
}

function LastOperation({ entry }: { entry: RotationHistoryEntry }) {
  const actor = entry.rotated_by_email ?? (entry.rotated_by ? `${entry.rotated_by.slice(0, 8)}…` : "—");
  return <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 animate-in fade-in duration-200"><div className="flex items-center justify-between gap-2 flex-wrap"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide"><Clock className="h-3.5 w-3.5" /> Última operação</div><ActionBadge type={(entry.action_type ?? "rotate") as "set" | "rotate"} /></div><div className="flex items-center gap-2 flex-wrap text-sm"><span className="font-mono text-xs">{entry.previous_suffix ? formatMaskedSuffix(entry.previous_suffix) : <span className="text-muted-foreground">(env / vazio)</span>}</span><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-mono text-xs font-semibold text-primary">{entry.new_suffix ? formatMaskedSuffix(entry.new_suffix) : "—"}</span></div><div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><User className="h-3 w-3" />Por <span className="text-foreground font-medium" title={entry.rotated_by ?? undefined}>{actor}</span></span><span title={formatDateTime(entry.rotated_at)}>{formatRelative(entry.rotated_at)} · {formatDateTime(entry.rotated_at)}</span></div>{entry.notes && <div className="text-xs text-muted-foreground italic border-t border-primary/10 pt-2">"{entry.notes}"</div>}</div>;
}

function HistoryTableRow({ entry }: { entry: RotationHistoryEntry }) {
  return <TableRow><TableCell className="text-xs"><div>{formatRelative(entry.rotated_at)}</div><div className="text-muted-foreground">{formatDateTime(entry.rotated_at)}</div></TableCell><TableCell><ActionBadge type={(entry.action_type ?? "rotate") as "set" | "rotate"} /></TableCell><TableCell className="font-mono text-xs">{entry.previous_suffix ? formatMaskedSuffix(entry.previous_suffix) : <span className="text-muted-foreground">(env / vazio)</span>}</TableCell><TableCell className="font-mono text-xs">{entry.new_suffix ? formatMaskedSuffix(entry.new_suffix) : "—"}</TableCell><TableCell className="text-xs">{entry.rotated_by_email ?? <span className="text-muted-foreground font-mono">{entry.rotated_by?.slice(0, 8) ?? "—"}…</span>}</TableCell><TableCell className="text-xs text-muted-foreground">{entry.notes || "—"}</TableCell></TableRow>;
}

function HistoryContent({ entries, loading }: { entries: RotationHistoryEntry[]; loading: boolean }) {
  if (loading) return <div className="space-y-2"><Skeleton className="h-16 w-full" />{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>;
  if (entries.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma operação registrada para esta credencial ainda.</p>;
  return <>{entries[0] && <LastOperation entry={entries[0]} />}<div className="max-h-[50vh] overflow-auto"><Table><TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Ação</TableHead><TableHead>De</TableHead><TableHead>Para</TableHead><TableHead>Autor</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader><TableBody>{entries.map((entry) => <HistoryTableRow key={entry.id} entry={entry} />)}</TableBody></Table></div></>;
}

export function RotationHistoryDialog({ secretName, open, onOpenChange }: Props) {
  const { getRotationHistory } = useSecretsManager();
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<RotationHistoryEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getRotationHistory(secretName).then((data) => {
      if (cancelled) return;
      setEntries(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, secretName, getRotationHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {(<DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico da credencial
            {!loading && entries.length > 0 && (
              <Badge variant="outline" className="ml-1 font-mono text-[10px]">
                {entries.length} {entries.length === 1 ? "registro" : "registros"}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs break-all">{secretName}</DialogDescription>
        </DialogHeader>)}

        <HistoryContent entries={entries} loading={loading} />
      </DialogContent>
    </Dialog>
  );
}
