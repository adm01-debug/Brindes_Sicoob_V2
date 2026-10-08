/**
 * Linha de evento de auditoria de chave MCP.
 * Mostra ator, ação, prefixo, IP e diff resumido para eventos `updated`.
 */
import { isNullish } from "@/components/admin/utils/nullish";
import { Badge } from "@/components/ui/badge";
import { KeyRound, RotateCw, Pencil, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AuditFeedRow } from "./useMcpAuditFeed";

const META: Record<string, { label: string; Icon: typeof KeyRound; tone: string }> = {
  "mcp_key.issued": { label: "Emitida", Icon: KeyRound, tone: "text-emerald-600" },
  "mcp_key.rotated": { label: "Rotacionada", Icon: RotateCw, tone: "text-blue-600" },
  "mcp_key.updated": { label: "Editada", Icon: Pencil, tone: "text-amber-600" },
  "mcp_key.revoked": { label: "Revogada", Icon: XCircle, tone: "text-destructive" },
  "mcp_key.scope_escalated": { label: "Escalada p/ FULL", Icon: AlertTriangle, tone: "text-destructive" },
};

interface Props { row: AuditFeedRow }

type AuditDetails = Record<string, unknown>;

interface AuditMeta {
  label: string;
  Icon: typeof KeyRound;
  tone: string;
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  return [];
}

function optionalText(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}

function hasTargetDetails(values: Array<string | undefined>): boolean {
  return values.some(Boolean);
}

function AuditHeader({ row, meta }: { row: AuditFeedRow; meta: AuditMeta }) {
  const Icon = meta.Icon;
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${meta.tone}`} />
        <Badge variant="outline" className="text-xs">{meta.label}</Badge>
        {row.is_full && <Badge variant="destructive" className="text-xs">FULL</Badge>}
        {row.escalated && row.action !== "mcp_key.scope_escalated" && (
          <Badge variant="destructive" className="text-xs">ESCALAÇÃO</Badge>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {format(new Date(row.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
      </span>
    </div>
  );
}

function ActorSummary({ row }: Props) {
  const actor = row.actor_name ?? row.actor_email ?? row.user_id ?? "—";
  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
      <div>
        <span className="text-foreground font-medium">{actor}</span>
        {row.actor_email && row.actor_name && <span className="ml-1">({row.actor_email})</span>}
      </div>
      <div className="font-mono">{row.key_prefix ? `${row.key_prefix}…` : ""}</div>
    </div>
  );
}

function ChangedFields({ fields }: { fields: string[] }) {
  if (fields.length === 0) return null;
  return (
    <div className="mt-2 text-xs">
      <span className="text-muted-foreground">Campos: </span>
      {fields.map(field => (
        <Badge key={field} variant="secondary" className="text-[10px] mr-1 font-mono">{field}</Badge>
      ))}
    </div>
  );
}

function ScopeChanges({ before, after }: { before: string[]; after: string[] }) {
  if (before.length === 0 && after.length === 0) return null;
  return (
    <div className="mt-2 text-xs flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground">Escopos:</span>
      <span className="line-through text-muted-foreground/70 font-mono">{before.join(", ") || "—"}</span>
      <span className="text-muted-foreground">→</span>
      <span className="font-mono text-foreground">{after.join(", ") || "—"}</span>
    </div>
  );
}

function TargetDetails({ details, isFull }: { details: AuditDetails; isFull: boolean }) {
  const targetRepo = optionalText(details.target_repo);
  const targetTool = optionalText(details.target_tool);
  const expiresAt = optionalText(details.expires_at);
  const justification = optionalText(details.justification);
  const fullJustification = isFull ? justification : undefined;
  const hasContent = hasTargetDetails([targetRepo, targetTool, expiresAt, fullJustification]);
  if (!hasContent) return null;

  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs">
      {targetRepo && <div><span className="text-muted-foreground">Repo: </span><span className="font-mono text-foreground">{targetRepo}</span></div>}
      {targetTool && <div><span className="text-muted-foreground">Tool: </span><span className="font-mono text-foreground">{targetTool}</span></div>}
      {expiresAt && (
        <div>
          <span className="text-muted-foreground">Expira: </span>
          <span className="font-mono text-foreground">{format(new Date(expiresAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
        </div>
      )}
      {details.step_up_verified === true && <div><Badge variant="outline" className="text-[10px]">✓ Verificação dupla</Badge></div>}
      {fullJustification && <div className="sm:col-span-2 text-muted-foreground italic">"{fullJustification}"</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: AuditFeedRow['status'] }) {
  if (!status) return null;
  let variant: "outline" | "secondary" | "destructive" = "destructive";
  if (status === "success") variant = "outline";
  if (status === "denied") variant = "secondary";
  return <Badge variant={variant} className="text-[10px] uppercase">{status}</Badge>;
}

function RequestDetails({ row }: Props) {
  const hasContent = Boolean(row.request_id || !isNullish(row.duration_ms) || row.status || row.source);
  if (!hasContent) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
      <StatusBadge status={row.status} />
      {row.source && <span>src: {row.source}</span>}
      {!isNullish(row.duration_ms) && <span>· {row.duration_ms}ms</span>}
      {row.request_id && <span title={row.request_id}>· req: {row.request_id.slice(0, 8)}…</span>}
    </div>
  );
}

function NetworkDetails({ row }: Props) {
  if (!row.ip_address) return null;
  return (
    <div className="mt-1 text-[10px] text-muted-foreground font-mono">
      IP: {row.ip_address}
      {row.user_agent && <span className="ml-2 truncate inline-block max-w-[300px] align-middle">UA: {row.user_agent}</span>}
    </div>
  );
}

export function McpAuditRow({ row }: Props) {
  const meta = (META[row.action] ?? { label: row.action, Icon: KeyRound, tone: "text-muted-foreground" });
  const d = ((row.details ?? {}) as Record<string, unknown>);
  const fields = arr(d.fields_changed);
  const diff = ((d.diff ?? {}) as Record<string, { before?: unknown; after?: unknown }>);
  const beforeScopes = arr((diff.scopes?.before ?? d.before_scopes));
  const afterScopes = arr((diff.scopes?.after ?? d.after_scopes));

  return (
    <li className="border border-border rounded-md p-3 hover:bg-muted/30 transition-colors">
      <AuditHeader row={row} meta={meta} />
      <ActorSummary row={row} />
      <ChangedFields fields={fields} />
      <ScopeChanges before={beforeScopes} after={afterScopes} />
      <TargetDetails details={d} isFull={Boolean(row.is_full)} />
      <RequestDetails row={row} />
      <NetworkDetails row={row} />
    </li>
  );
}
