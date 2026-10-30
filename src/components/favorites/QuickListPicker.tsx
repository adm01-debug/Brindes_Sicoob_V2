import { type ReactNode, useState } from "react";
import { Heart, Plus, Check } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { FavoriteList } from "@/hooks/useFavoriteLists";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lists: FavoriteList[];
  /** id de listas em que o produto já está. */
  existingListIds: Set<string>;
  onPick: (listId: string) => void;
  onCreateAndPick: (name: string) => Promise<string>;
  /** Trigger element (ex.: ícone de coração). */
  children: ReactNode;
  /** Nome do produto sendo adicionado (mostrado no header). */
  productName?: string;
  /** Variante atual selecionada (cor) — exibida com swatch. */
  variantInfo?: { color_name?: string | null; color_hex?: string | null } | null;
}

function ColorSwatch({ color }: { color?: string | null }) {
  return color ? <span className="inline-block w-3 h-3 rounded-full border border-border shrink-0" style={{ backgroundColor: color }} aria-hidden /> : null;
}

function ContextName({ productName, colorName }: { productName?: string; colorName?: string | null }) {
  return <span className="truncate">{productName && <strong className="font-medium">{productName}</strong>}{productName && colorName ? " — " : ""}{colorName ?? ""}</span>;
}

function ProductContext({ productName, variantInfo }: Pick<Props, "productName" | "variantInfo">) {
  const colorName = variantInfo ? variantInfo.color_name : null;
  if (!productName && !colorName) return null;
  return <div className="px-2 pb-1.5 -mt-1 flex items-center gap-1.5 text-[11px] text-foreground/80 border-b mb-1"><ColorSwatch color={variantInfo ? variantInfo.color_hex : null} /><ContextName productName={productName} colorName={colorName} /></div>;
}

function ListOption({ list, exists, onPick }: { list: FavoriteList; exists: boolean; onPick: () => void }) {
  return <button type="button" onClick={event => { event.stopPropagation(); onPick(); }} className={cn("w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors hover:bg-muted", exists && "bg-success/10 text-success-foreground")}><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: list.color }} /><Heart className="h-3.5 w-3.5 shrink-0 opacity-60" fill={exists ? "currentColor" : "none"} /><span className="flex-1 truncate">{list.name}</span>{list.is_default && <span className="text-[9px] uppercase text-muted-foreground">padrão</span>}{exists && <Check className="h-3.5 w-3.5 text-success" />}</button>;
}

function CreateListControl({ creating, name, setName, onCreate, onCancel, onStart }: { creating: boolean; name: string; setName: (name: string) => void; onCreate: () => void; onCancel: () => void; onStart: () => void }) {
  if (!creating) return <button type="button" onClick={event => { event.stopPropagation(); onStart(); }} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Plus className="h-3.5 w-3.5" />Nova lista…</button>;
  return <div className="flex gap-1 p-1"><Input autoFocus value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") onCreate(); if (event.key === "Escape") onCancel(); }} placeholder="Nome da nova lista" className="h-7 text-xs" /><Button size="sm" className="h-7 px-2 text-xs" onClick={onCreate}>OK</Button></div>;
}

/**
 * Popover compacto para selecionar lista ao favoritar a partir do catálogo.
 * Mostra lista atual, permite criar nova lista inline.
 */
export function QuickListPicker({
  open, onOpenChange, lists, existingListIds, onPick, onCreateAndPick, children,
  productName, variantInfo,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const id = await onCreateAndPick(name);
    onPick(id);
    setNewName("");
    setCreating(false);
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-64 p-2"
        align="end"
        side="bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Salvar em qual lista?
        </div>
        <ProductContext productName={productName} variantInfo={variantInfo} />
        <ScrollArea className="max-h-60">
          <div className="space-y-0.5">
            {lists.map(list => <ListOption key={list.id} list={list} exists={existingListIds.has(list.id)} onPick={() => { onPick(list.id); onOpenChange(false); }} />)}
          </div>
        </ScrollArea>
        <div className="border-t mt-1 pt-1">
          <CreateListControl creating={creating} name={newName} setName={setNewName} onCreate={handleCreate} onCancel={() => { setCreating(false); setNewName(""); }} onStart={() => setCreating(true)} />
        </div>
        <div className="text-[10px] text-muted-foreground px-2 pt-1.5 border-t mt-1">
          Dica: <kbd className="px-1 rounded bg-muted">Shift</kbd>+clique salva direto na lista padrão.
        </div>
      </PopoverContent>
    </Popover>
  );
}
