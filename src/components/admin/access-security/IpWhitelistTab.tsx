import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Monitor, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface IpEntry {
  id: string;
  ip_address: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

interface IpWhitelistTabProps {
  ips: IpEntry[];
  onAdd: (ip: string, label?: string) => Promise<boolean>;
  onRemove: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}

function IpAddForm({ ip, label, adding, onIpChange, onLabelChange, onAdd }: { ip: string; label: string; adding: boolean; onIpChange: (value: string) => void; onLabelChange: (value: string) => void; onAdd: () => void }) {
  return <div className="flex gap-2 items-end"><div className="flex-1 space-y-1"><Label className="text-xs">Endereço IP</Label><Input placeholder="192.168.1.100 ou 10.0.0.0/24" value={ip} onChange={(event) => onIpChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onAdd()} /></div><div className="flex-1 space-y-1"><Label className="text-xs">Rótulo (opcional)</Label><Input placeholder="Ex: Escritório SP" value={label} onChange={(event) => onLabelChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onAdd()} /></div><Button onClick={onAdd} disabled={adding || !ip.trim()} className="gap-1">{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Adicionar</Button></div>;
}

function RemoveIpButton({ entry, onRemove }: { entry: IpEntry; onRemove: (id: string) => void }) {
  return <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover IP?</AlertDialogTitle><AlertDialogDescription>O IP <span className="font-mono font-bold">{entry.ip_address}</span> será removido da whitelist.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => onRemove(entry.id)} className="bg-destructive text-destructive-foreground">Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function IpsTable({ ips, onRemove, onToggle }: Pick<IpWhitelistTabProps, "ips" | "onRemove" | "onToggle">) {
  if (ips.length === 0) return <div className="text-center py-8 text-muted-foreground"><Monitor className="h-8 w-8 mx-auto mb-2 opacity-40" />Nenhum IP cadastrado</div>;
  return <Table><TableHeader><TableRow><TableHead>IP</TableHead><TableHead>Rótulo</TableHead><TableHead>Status</TableHead><TableHead>Adicionado em</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{ips.map((entry) => <TableRow key={entry.id}><TableCell className="font-mono text-sm">{entry.ip_address}</TableCell><TableCell>{entry.label || "—"}</TableCell><TableCell><Switch checked={entry.is_active} onCheckedChange={(checked) => onToggle(entry.id, checked)} /></TableCell><TableCell className="text-muted-foreground text-xs">{format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell><TableCell className="text-right"><RemoveIpButton entry={entry} onRemove={onRemove} /></TableCell></TableRow>)}</TableBody></Table>;
}

export function IpWhitelistTab({ ips, onAdd, onRemove, onToggle }: IpWhitelistTabProps) {
  const [newIp, setNewIp] = useState("");
  const [newIpLabel, setNewIpLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newIp.trim()) return;
    setAdding(true);
    const ok = await onAdd(newIp.trim(), newIpLabel.trim() || undefined);
    if (ok) { setNewIp(""); setNewIpLabel(""); }
    setAdding(false);
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">IPs na Whitelist</CardTitle>
        <CardDescription>
          Adicione endereços IP que podem acessar o sistema. Suporta IPs individuais e ranges CIDR (/24, /16).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <IpAddForm ip={newIp} label={newIpLabel} adding={adding} onIpChange={setNewIp} onLabelChange={setNewIpLabel} onAdd={handleAdd} />
        <IpsTable ips={ips} onRemove={onRemove} onToggle={onToggle} />
      </CardContent>
    </Card>
  );
}
