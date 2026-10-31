/**
 * Drawer com detalhes técnicos de uma chave MCP + audit log filtrado
 * por `resource_id`. Read-only, complementa a linha do listado.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { McpKeyRow } from "./useMcpKeys";

interface AuditEntry {
  id: string;
  action: string;
  user_id: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
}

interface Props {
  source: McpKeyRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_LABELS: Record<string, string> = {
  "mcp_key.issued": "Emitida",
  "mcp_key.rotated": "Rotacionada",
  "mcp_key.revoked": "Revogada",
};

function statusLabel(status: McpKeyRow['status']): string {
  if (status === 'active') return 'Ativa';
  if (status === 'expired') return 'Expirada';
  return 'Revogada';
}

function formatOptionalDate(value: string | null, fallback: string): string {
  if (!value) return fallback;
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

function KeyStatus({ source }: { source: McpKeyRow }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Status</h3>
      <div className="flex flex-wrap gap-1">
        <Badge variant={source.status === "active" ? "outline" : "destructive"}>{statusLabel(source.status)}</Badge>
        {source.is_full && <Badge variant="destructive">FULL</Badge>}
      </div>
    </section>
  );
}

function KeyScopes({ source }: { source: McpKeyRow }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Escopos</h3>
      <div className="flex flex-wrap gap-1">{source.scopes.map(scope => <Badge key={scope} variant={scope === "*" ? "destructive" : "secondary"} className="font-mono text-xs">{scope}</Badge>)}</div>
    </section>
  );
}

function KeyDates({ source }: { source: McpKeyRow }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Datas</h3>
      <ul className="space-y-0.5 text-muted-foreground">
        <li>Criada em: {formatOptionalDate(source.created_at, '—')}</li>
        <li>Expira: {formatOptionalDate(source.expires_at, 'sem expiração')}</li>
        <li>Último uso: {formatOptionalDate(source.last_used_at, 'nunca usada')}</li>
        {source.revoked_at && <li>Revogada em: {formatOptionalDate(source.revoked_at, '—')}</li>}
      </ul>
    </section>
  );
}

function KeyCreator({ source }: { source: McpKeyRow }) {
  const creator = source.creator_name ?? source.creator_email ?? source.created_by;
  return (
    <section className="space-y-1">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Criador</h3>
      <p>{creator}</p>
      {source.creator_email && source.creator_name && <p className="text-xs text-muted-foreground">{source.creator_email}</p>}
    </section>
  );
}

function OptionalKeyDetails({ source }: { source: McpKeyRow }) {
  return (
    <>
      {source.rotated_from && <section className="space-y-1"><h3 className="text-xs uppercase tracking-wide text-muted-foreground">Origem da rotação</h3><p className="text-xs font-mono break-all">{source.rotated_from}</p></section>}
      {source.description && <section className="space-y-1"><h3 className="text-xs uppercase tracking-wide text-muted-foreground">Justificativa registrada</h3><p className="text-xs italic">"{source.description}"</p></section>}
    </>
  );
}

function AuditHistory({ entries, loading }: { entries: AuditEntry[]; loading: boolean }) {
  let content = <p className="text-xs text-muted-foreground">Nenhum evento registrado.</p>;
  if (loading) {
    content = <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
  } else if (entries.length > 0) {
    content = (
      <ul className="space-y-2">
        {entries.map(entry => <li key={entry.id} className="border border-border rounded-md p-2"><div className="flex items-center justify-between text-xs"><Badge variant="outline" className="text-xs">{ACTION_LABELS[entry.action] ?? entry.action}</Badge><span className="text-muted-foreground">{format(new Date(entry.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}</span></div>{entry.ip_address && <p className="text-[10px] text-muted-foreground mt-1 font-mono">IP: {entry.ip_address}</p>}</li>)}
      </ul>
    );
  }
  return <section className="space-y-2"><h3 className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1"><ClipboardList className="h-3 w-3" /> Histórico de auditoria</h3>{content}</section>;
}

function KeyDetails({ source, entries, loading }: { source: McpKeyRow; entries: AuditEntry[]; loading: boolean }) {
  return (
    <ScrollArea className="flex-1 -mr-6 pr-6 mt-4">
      <div className="space-y-4 text-sm">
        <KeyStatus source={source} />
        <KeyScopes source={source} />
        <KeyDates source={source} />
        <KeyCreator source={source} />
        <OptionalKeyDetails source={source} />
        <AuditHistory entries={entries} loading={loading} />
      </div>
    </ScrollArea>
  );
}

export function McpKeyDetailsDrawer({ source, open, onOpenChange }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !source) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("admin_audit_log")
        .select("id, action, user_id, created_at, ip_address, user_agent, details")
        .eq("resource_type", "mcp_api_key")
        .eq("resource_id", source.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled) {
        setEntries((data ?? []) as AuditEntry[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, source]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        {(<SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {source?.is_full && <ShieldAlert className="h-4 w-4 text-destructive" />}
            {source?.name ?? "Chave MCP"}
          </SheetTitle>
          <SheetDescription>
            <code className="font-mono text-xs">{source?.key_prefix}…</code>
          </SheetDescription>
        </SheetHeader>)}

        {source && <KeyDetails source={source} entries={entries} loading={loading} />}
      </SheetContent>
    </Sheet>
  );
}
