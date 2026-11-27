/**
 * Painel de Auditoria de Roles
 *
 * Lista cronologicamente todas as mudanças de papel registradas em
 * `admin_audit_log` pelo trigger `audit_user_role_changes` e pela
 * edge function `manage-users` (action `promote_role`).
 *
 * Origem dos eventos:
 *  - role.granted   → trigger (INSERT em user_roles)
 *  - role.changed   → trigger (UPDATE em user_roles)
 *  - role.revoked   → trigger (DELETE em user_roles)
 *  - role.promote   → edge function manage-users
 *  - role.demote    → edge function manage-users
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, History, ArrowRight, RefreshCw, Database } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ROLE_ACTIONS = [
  "role.granted",
  "role.changed",
  "role.revoked",
  "role.promote",
  "role.demote",
] as const;

type RoleAction = (typeof ROLE_ACTIONS)[number];

interface RoleAuditEntry {
  id: string;
  created_at: string;
  user_id: string;     // ator
  action: RoleAction;
  resource_id: string | null; // alvo
  source: string | null;
  details: Record<string, unknown> | null;
}

interface ProfileLite {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const ACTION_LABEL: Record<RoleAction, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  "role.granted": { label: "Concedido", variant: "default" },
  "role.changed": { label: "Alterado", variant: "secondary" },
  "role.revoked": { label: "Revogado", variant: "destructive" },
  "role.promote": { label: "Promovido", variant: "default" },
  "role.demote":  { label: "Rebaixado", variant: "outline" },
};

const EMPTY_PROFILES = new Map<string, ProfileLite>();

function profileMatches(profile: ProfileLite | undefined, query: string): boolean {
  return [profile?.full_name, profile?.email]
    .some((value) => value?.toLowerCase().includes(query));
}

function entryMatches(
  entry: RoleAuditEntry,
  profiles: Map<string, ProfileLite>,
  query: string,
): boolean {
  const actor = profiles.get(entry.user_id);
  const target = entry.resource_id ? profiles.get(entry.resource_id) : undefined;
  return profileMatches(actor, query) || profileMatches(target, query);
}

function UserDetails({ userId, profiles }: { userId: string | null; profiles: Map<string, ProfileLite> }) {
  if (!userId) return <span className="text-muted-foreground">—</span>;
  const profile = profiles.get(userId);
  if (!profile) return <span className="text-muted-foreground font-mono text-xs">{userId.slice(0, 8)}…</span>;
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium">{profile.full_name || "Sem nome"}</span>
      {profile.email && <span className="text-[11px] text-muted-foreground">{profile.email}</span>}
    </div>
  );
}

function RoleChange({ oldRole, newRole, reason }: { oldRole: string | null; newRole: string | null; reason?: string }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {oldRole ? <RoleBadge role={oldRole} /> : <span className="text-xs text-muted-foreground">—</span>}
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      {newRole ? <RoleBadge role={newRole} /> : <span className="text-xs text-muted-foreground">—</span>}
      {reason && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[10px] cursor-help">motivo</Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{reason}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function RoleAuditRow({ entry, profiles }: { entry: RoleAuditEntry; profiles: Map<string, ProfileLite> }) {
  const oldRole = (entry.details?.old_role as string | null) ?? null;
  const newRole = (entry.details?.new_role as string | null) ?? null;
  const reason = (entry.details?.reason as string | undefined) ?? undefined;
  const meta = ACTION_LABEL[entry.action];
  return (
    <TableRow>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell><UserDetails userId={entry.user_id} profiles={profiles} /></TableCell>
      <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
      <TableCell><UserDetails userId={entry.resource_id} profiles={profiles} /></TableCell>
      <TableCell>
        <RoleChange oldRole={oldRole} newRole={newRole} reason={reason} />
      </TableCell>
      <TableCell>
        <span className="text-[11px] text-muted-foreground font-mono">{entry.source || "—"}</span>
      </TableCell>
    </TableRow>
  );
}

export function RoleAuditLogPanel() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | RoleAction>("all");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["role-audit-log", actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("admin_audit_log")
        .select("id, created_at, user_id, action, resource_id, source, details")
        .in("action", ROLE_ACTIONS as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(200);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data: entries, error } = await query;
      if (error) throw error;

      const ids = new Set<string>();
      (entries ?? []).forEach((e) => {
        if (e.user_id) ids.add(e.user_id);
        if (e.resource_id) ids.add(e.resource_id);
      });

      const profilesMap = new Map<string, ProfileLite>();
      if (ids.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", Array.from(ids));
        (profiles ?? []).forEach((p) => profilesMap.set(p.user_id, p));
      }

      return { entries: (entries ?? []) as RoleAuditEntry[], profilesMap };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const profilesMap = data?.profilesMap ?? EMPTY_PROFILES;

  const filtered = useMemo(() => {
    const entries = data?.entries ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => entryMatches(entry, profilesMap, q));
  }, [data?.entries, profilesMap, search]);

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Auditoria de Roles</CardTitle>
            <CardDescription>
              Histórico completo de mudanças de papel — capturado automaticamente pelo trigger no banco e pela função de promoção.
            </CardDescription>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Buscar por nome ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as typeof actionFilter)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tipo de ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {ROLE_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{ACTION_LABEL[a].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma alteração de role registrada {search ? "para esta busca" : "ainda"}.
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Quando</TableHead>
                  <TableHead>Ator</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Usuário-alvo</TableHead>
                  <TableHead>Mudança</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <RoleAuditRow key={entry.id} entry={entry} profiles={profilesMap} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Mostrando até 200 registros mais recentes. Apenas DEV pode visualizar este log.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Trilha bruta de `admin_config_audit`: o trigger `fn_audit_config_change`
 * grava o estado completo (old_data/new_data) de cada mudança em `user_roles`,
 * inclusive as que chegam por service_role e não têm ator no JWT — casos em
 * que `admin_audit_log` registra o próprio alvo como ator. Serve como fonte
 * de verdade para auditoria: mostra o que foi alterado, não o que o código
 * decidiu reportar.
 */
interface ConfigAuditEntry {
  id: string;
  action_type: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  old_data: { user_id?: string; role?: string } | null;
  new_data: { user_id?: string; role?: string } | null;
  changed_by: string | null;
  changed_at: string | null;
}

const CONFIG_ACTION_LABEL: Record<ConfigAuditEntry["action_type"], { label: string; variant: "default" | "secondary" | "destructive" }> = {
  INSERT: { label: "Criado", variant: "default" },
  UPDATE: { label: "Alterado", variant: "secondary" },
  DELETE: { label: "Excluído", variant: "destructive" },
};

function configActionLabel(action: ConfigAuditEntry["action_type"]) {
  return CONFIG_ACTION_LABEL[action] ?? { label: action, variant: "secondary" as const };
}

function relativeDate(value: string | null) {
  return value
    ? formatDistanceToNow(new Date(value), { addSuffix: true, locale: ptBR })
    : "—";
}

function ConfigAuditRow({ entry, profiles }: { entry: ConfigAuditEntry; profiles: Map<string, ProfileLite> }) {
  const meta = configActionLabel(entry.action_type);
  const anterior = entry.old_data?.role ?? null;
  const posterior = entry.new_data?.role ?? null;
  const alvo = entry.new_data?.user_id ?? entry.old_data?.user_id ?? null;
  return (
    <TableRow>
      <TableCell>
        <span className="text-xs text-muted-foreground">{relativeDate(entry.changed_at)}</span>
      </TableCell>
      <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
      <TableCell><UserDetails userId={alvo} profiles={profiles} /></TableCell>
      <TableCell><RoleChange oldRole={anterior} newRole={posterior} /></TableCell>
      <TableCell>
        {entry.changed_by ? (
          <UserDetails userId={entry.changed_by} profiles={profiles} />
        ) : (
          <span className="text-[11px] text-muted-foreground">sem ator (serviço/trigger)</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function ConfigAuditTable({ entries, profiles, isLoading, isError }: {
  entries: ConfigAuditEntry[];
  profiles: Map<string, ProfileLite>;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="text-center py-8 text-sm text-destructive">
        Não foi possível carregar a trilha bruta. A tabela é visível apenas para admin/gestor.
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Nenhum registro na trilha bruta ainda.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Quando</TableHead>
            <TableHead>Operação</TableHead>
            <TableHead>Usuário-alvo</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Executado por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <ConfigAuditRow key={entry.id} entry={entry} profiles={profiles} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function RawConfigAuditPanel() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-config-audit", "user_roles"],
    queryFn: async () => {
      const { data: entries, error } = await supabase
        .from("admin_config_audit")
        .select("id, action_type, table_name, old_data, new_data, changed_by, changed_at")
        .eq("table_name", "user_roles")
        .order("changed_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;

      const ids = new Set<string>();
      (entries ?? []).forEach((e) => {
        if (e.changed_by) ids.add(e.changed_by);
        const alvo = (e.new_data as { user_id?: string } | null)?.user_id
          ?? (e.old_data as { user_id?: string } | null)?.user_id;
        if (alvo) ids.add(alvo);
      });

      const profilesMap = new Map<string, ProfileLite>();
      if (ids.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", Array.from(ids));
        (profiles ?? []).forEach((p) => profilesMap.set(p.user_id, p));
      }
      return { entries: (entries ?? []) as unknown as ConfigAuditEntry[], profilesMap };
    },
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

  const profilesMap = data?.profilesMap ?? EMPTY_PROFILES;

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Trilha bruta (admin_config_audit)</CardTitle>
            <CardDescription>
              Estado linha a linha gravado pelo trigger direto na tabela — inclui mudanças feitas por serviços, sem ator no JWT.
            </CardDescription>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <ConfigAuditTable
          entries={data?.entries ?? []}
          profiles={profilesMap}
          isLoading={isLoading}
          isError={isError}
        />
        <p className="text-[11px] text-muted-foreground mt-3">
          Mostrando até 200 registros mais recentes de <code>user_roles</code>.
        </p>
      </CardContent>
    </Card>
  );
}
