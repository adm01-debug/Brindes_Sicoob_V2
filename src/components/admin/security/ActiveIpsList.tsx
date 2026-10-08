import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, RefreshCw, Clock, Infinity as InfinityIcon, Trash2, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface IpEntry {
  id: string;
  ip_address: string;
  list_type: string;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
  created_by: string;
}

type Filter = "all" | "allow" | "block" | "active" | "expired";

function matchesStatusFilter(item: IpEntry, filter: Filter, isActive: boolean): boolean {
  if (filter === "allow") return item.list_type === "allow";
  if (filter === "block") return item.list_type === "block";
  if (filter === "active") return isActive;
  if (filter === "expired") return !isActive;
  return true;
}

function matchesIpSearch(item: IpEntry, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return item.ip_address.toLowerCase().includes(query) || (item.reason ?? "").toLowerCase().includes(query);
}

function matchesIpFilter(item: IpEntry, filter: Filter, search: string, now: number): boolean {
  const isActive = !item.expires_at || new Date(item.expires_at).getTime() > now;
  return matchesStatusFilter(item, filter, isActive) && matchesIpSearch(item, search);
}

type IpActions = {
  revoke: (id: string) => Promise<void>;
  extend: (id: string, currentExpires: string | null) => Promise<void>;
  makePermanent: (id: string) => Promise<void>;
};

function ActiveIpsFilters({ search, setSearch, filter, setFilter, loading, reload }: { search: string; setSearch: (value: string) => void; filter: Filter; setFilter: (value: Filter) => void; loading: boolean; reload: () => void }) {
  return <div className="flex flex-wrap items-center gap-2"><Input placeholder="Buscar IP ou motivo…" value={search} onChange={event => setSearch(event.target.value)} className="h-9 w-[180px]" /><Select value={filter} onValueChange={value => setFilter(value as Filter)}><SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="allow">Allow</SelectItem><SelectItem value="block">Block</SelectItem><SelectItem value="active">Ativos</SelectItem><SelectItem value="expired">Expirados</SelectItem></SelectContent></Select><Button variant="outline" size="sm" onClick={reload} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button></div>;
}

function IpExpiration({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="inline-flex items-center gap-1 text-muted-foreground"><InfinityIcon className="h-3 w-3" /> permanente</span>;
  return <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(expiresAt), "dd/MM HH:mm", { locale: ptBR })}</span>;
}

function IpRow({ item, now, actions }: { item: IpEntry; now: number; actions: IpActions }) {
  const active = !item.expires_at || new Date(item.expires_at).getTime() > now;
  return <TableRow><TableCell className="font-mono text-xs">{item.ip_address}</TableCell><TableCell><Badge variant={item.list_type === "block" ? "destructive" : "outline"} className="text-xs">{item.list_type}</Badge></TableCell><TableCell>{active ? <Badge className="text-xs">Ativo</Badge> : <Badge variant="secondary" className="text-xs">Expirado</Badge>}</TableCell><TableCell className="max-w-[260px] truncate text-xs text-muted-foreground" title={item.reason || ""}>{item.reason || "—"}</TableCell><TableCell className="text-xs whitespace-nowrap"><IpExpiration expiresAt={item.expires_at} /></TableCell><TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}</TableCell><TableCell><div className="flex justify-end gap-1">{item.expires_at && active && <><Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void actions.extend(item.id, item.expires_at)} title="Estender +24h"><CalendarPlus className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void actions.makePermanent(item.id)} title="Tornar permanente"><InfinityIcon className="h-3.5 w-3.5" /></Button></>}<Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => void actions.revoke(item.id)} title="Revogar"><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell></TableRow>;
}

function ActiveIpsTable({ items, loading, now, actions }: { items: IpEntry[]; loading: boolean; now: number; actions: IpActions }) {
  return <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>IP</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Motivo</TableHead><TableHead>Expira</TableHead><TableHead>Criado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{items.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{loading ? "Carregando…" : "Nenhum IP encontrado"}</TableCell></TableRow> : items.map(item => <IpRow key={item.id} item={item} now={now} actions={actions} />)}</TableBody></Table></div>;
}

type Toast = ReturnType<typeof useToast>['toast'];

async function revokeIp(id: string, toast: Toast): Promise<boolean> {
  const { error } = await supabase.from("ip_access_control").delete().eq("id", id);
  if (error) { toast({ title: "Erro ao revogar", description: error.message, variant: "destructive" }); return false; }
  toast({ title: "IP revogado" });
  return true;
}

async function extendIp(id: string, currentExpires: string | null, toast: Toast): Promise<boolean> {
  const base = currentExpires ? new Date(currentExpires) : new Date();
  if (base.getTime() < Date.now()) base.setTime(Date.now());
  const expiresAt = new Date(base.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("ip_access_control").update({ expires_at: expiresAt }).eq("id", id);
  if (error) { toast({ title: "Erro ao estender", description: error.message, variant: "destructive" }); return false; }
  toast({ title: "Expiração estendida +24h" });
  return true;
}

async function makeIpPermanent(id: string, toast: Toast): Promise<boolean> {
  const { error } = await supabase.from("ip_access_control").update({ expires_at: null }).eq("id", id);
  if (error) { toast({ title: "Erro ao tornar permanente", description: error.message, variant: "destructive" }); return false; }
  toast({ title: "Bloqueio agora é permanente" });
  return true;
}

function useActiveIpsData() {
  const [items, setItems] = useState<IpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("ip_access_control").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar IPs", description: error.message, variant: "destructive" });
    else setItems(data || []);
    setLoading(false);
  }, [toast]);
  useEffect(() => { void load(); }, [load]);
  return { items, loading, load, toast };
}

export function ActiveIpsList() {
  const { items, loading, load, toast } = useActiveIpsData();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const now = Date.now();
  const filtered = useMemo(() => items.filter(item => matchesIpFilter(item, filter, search, now)), [items, filter, search, now]);
  const revoke = async (id: string) => {
    if (await revokeIp(id, toast)) void load();
  };
  const extend = async (id: string, currentExpires: string | null) => {
    if (await extendIp(id, currentExpires, toast)) void load();
  };
  const makePermanent = async (id: string) => {
    if (await makeIpPermanent(id, toast)) void load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> IPs ativos
          </CardTitle>
          <CardDescription>
            Gestão completa de allow/block — revogue, estenda ou converta em permanente
          </CardDescription>
        </div>
        <ActiveIpsFilters search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} loading={loading} reload={() => void load()} />
      </CardHeader>
      <CardContent><ActiveIpsTable items={filtered} loading={loading} now={now} actions={{ revoke, extend, makePermanent }} /></CardContent>
    </Card>
  );
}
