import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FavoritesClientPicker } from "./FavoritesClientPicker";
import type { FavoriteList } from "@/hooks/useFavoriteLists";

const COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#10B981", "#06B6D4",
  "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
  "#EC4899", "#F43F5E", "#64748B", "#0F172A",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existing?: FavoriteList;
  onCreate: (data: { name: string; color: string; icon: string; description?: string; client_id?: string | null; client_name?: string | null }) => Promise<void>;
}

function existingFormValues(existing: FavoriteList | undefined) {
  if (!existing) return { name: "", description: "", color: COLORS[8] ?? "#003641", client: null };
  const client = existing.client_id && existing.client_name ? { id: existing.client_id, name: existing.client_name } : null;
  return { name: existing.name, description: existing.description ?? "", color: existing.color ?? COLORS[8] ?? "#003641", client };
}

function useListForm(open: boolean, existing: FavoriteList | undefined, onCreate: Props["onCreate"], onOpenChange: Props["onOpenChange"]) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[8] ?? "#003641");
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const values = existingFormValues(existing);
    setName(values.name); setDescription(values.description); setColor(values.color); setClient(values.client);
  }, [open, existing]);
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await onCreate({ name: name.trim(), description: description.trim() || undefined, color, icon: "Heart", client_id: client?.id ?? null, client_name: client?.name ?? null }); onOpenChange(false); }
    finally { setBusy(false); }
  };
  return { name, setName, description, setDescription, color, setColor, client, setClient, busy, save };
}

type ListForm = ReturnType<typeof useListForm>;

function ListFields({ form }: { form: ListForm }) {
  return <div className="space-y-4"><div className="space-y-1.5"><Label htmlFor="list-name">Nome</Label><Input id="list-name" value={form.name} onChange={event => form.setName(event.target.value)} placeholder="Ex: Cliente Acme — Q4" maxLength={60} autoFocus /></div><div className="space-y-1.5"><Label htmlFor="list-desc">Descrição (opcional)</Label><Textarea id="list-desc" value={form.description} onChange={event => form.setDescription(event.target.value)} placeholder="Notas internas sobre esta lista…" maxLength={200} className="min-h-[60px]" /></div><div className="space-y-1.5"><Label>Cliente CRM (opcional)</Label><FavoritesClientPicker selectedClientId={form.client?.id ?? null} selectedClientName={form.client?.name ?? null} onSelect={form.setClient} /></div><div className="space-y-1.5"><Label>Cor</Label><div className="grid grid-cols-8 gap-2">{COLORS.map(color => <button key={color} type="button" onClick={() => form.setColor(color)} className={cn("w-8 h-8 rounded-lg border-2 transition-all", form.color === color ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105")} style={{ backgroundColor: color }} aria-label={`Cor ${color}`} />)}</div></div></div>;
}

export function CreateListDialog({ open, onOpenChange, existing, onCreate }: Props) {
  const form = useListForm(open, existing, onCreate, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar lista" : "Nova lista de favoritos"}</DialogTitle>
          <DialogDescription>
            Organize seus favoritos por cliente, projeto ou tema.
          </DialogDescription>
        </DialogHeader>

        <ListFields form={form} />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={form.busy}>
            Cancelar
          </Button>
          <Button onClick={form.save} disabled={!form.name.trim() || form.busy}>
            {form.busy ? "Salvando…" : existing ? "Salvar" : "Criar lista"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
