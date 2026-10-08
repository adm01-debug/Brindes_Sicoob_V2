/**
 * Orquestra a tela de chaves MCP: filtros, criação, listagem, rotação,
 * revogação e detalhes em drawer.
 */
import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, KeyRound } from "lucide-react";
import { useMcpKeys, type McpKeyRow as McpKeyRowType } from "./useMcpKeys";
import { McpKeysFilters } from "./McpKeysFilters";
import { McpKeyRow } from "./McpKeyRow";
import { RotateMcpKeyDialog } from "./RotateMcpKeyDialog";
import { UpdateMcpKeyDialog } from "./UpdateMcpKeyDialog";
import { McpKeyDetailsDrawer } from "./McpKeyDetailsDrawer";
import { IssueMcpKeyForm } from "@/components/admin/connections/IssueMcpKeyForm";

type KeysState = ReturnType<typeof useMcpKeys>;

function McpKeysHeader({ open, setOpen, reload }: { open: boolean; setOpen: (open: boolean) => void; reload: () => void }) {
  return <CardHeader><div className="flex items-start justify-between gap-3 flex-wrap"><div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /><div><CardTitle>Chaves MCP</CardTitle><CardDescription>Gerencie as chaves de API que dão acesso ao MCP server. Toda emissão, rotação e revogação é auditada.</CardDescription></div></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova chave</Button></DialogTrigger><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Gerar nova chave MCP</DialogTitle><DialogDescription>A chave será exibida apenas uma vez. Geração 100% server-side com validação de admin e fricção extra para escopo <code className="font-mono">*</code>.</DialogDescription></DialogHeader><IssueMcpKeyForm onIssued={reload} /></DialogContent></Dialog></div></CardHeader>;
}

function McpKeysContent({ state, onRotate, onEdit, onDetails }: { state: KeysState; onRotate: (row: McpKeyRowType) => void; onEdit: (row: McpKeyRowType) => void; onDetails: (row: McpKeyRowType) => void }) {
  return <CardContent className="space-y-4"><McpKeysFilters search={state.filters.search} status={state.filters.status} onlyFull={state.filters.onlyFull} sort={state.filters.sort} creator={state.filters.creator} createdFrom={state.filters.createdFrom} createdTo={state.filters.createdTo} creators={state.creators} counts={state.counts} onChange={patch => state.setFilters(current => ({ ...current, ...patch }))} />{state.loading ? <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : state.rows.length === 0 ? <div className="text-center py-12 text-muted-foreground"><KeyRound className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">Nenhuma chave encontrada com os filtros atuais.</p></div> : <div className="space-y-2">{state.rows.map(row => <McpKeyRow key={row.id} row={row} onRotate={onRotate} onRevoke={item => void state.revoke(item.id)} onDetails={onDetails} onEdit={onEdit} />)}</div>}</CardContent>;
}

function McpKeysDialogs({ rotateTarget, setRotateTarget, editTarget, setEditTarget, detailsTarget, setDetailsTarget, reload }: { rotateTarget: McpKeyRowType | null; setRotateTarget: (row: McpKeyRowType | null) => void; editTarget: McpKeyRowType | null; setEditTarget: (row: McpKeyRowType | null) => void; detailsTarget: McpKeyRowType | null; setDetailsTarget: (row: McpKeyRowType | null) => void; reload: () => void }) {
  return <><RotateMcpKeyDialog source={rotateTarget} open={rotateTarget !== null} onOpenChange={open => { if (!open) setRotateTarget(null); }} onRotated={reload} /><UpdateMcpKeyDialog source={editTarget} open={editTarget !== null} onOpenChange={open => { if (!open) setEditTarget(null); }} onUpdated={reload} /><McpKeyDetailsDrawer source={detailsTarget} open={detailsTarget !== null} onOpenChange={open => { if (!open) setDetailsTarget(null); }} /></>;
}

export function McpKeysList() {
  const state = useMcpKeys();
  const [issueOpen, setIssueOpen] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<McpKeyRowType | null>(null);
  const [editTarget, setEditTarget] = useState<McpKeyRowType | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<McpKeyRowType | null>(null);

  return (
    <Card>
      <McpKeysHeader open={issueOpen} setOpen={setIssueOpen} reload={state.reload} />
      <McpKeysContent state={state} onRotate={setRotateTarget} onEdit={setEditTarget} onDetails={setDetailsTarget} />
      <McpKeysDialogs rotateTarget={rotateTarget} setRotateTarget={setRotateTarget} editTarget={editTarget} setEditTarget={setEditTarget} detailsTarget={detailsTarget} setDetailsTarget={setDetailsTarget} reload={state.reload} />
    </Card>
  );
}
