import { useState, useCallback, useMemo } from "react";
import { Palette, Send, Check, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductColor } from "@/hooks/useProducts";
import { ShareContactSelector, type ShareContactSelection } from "./ShareContactSelector";
import { WhatsAppPreview } from "./WhatsAppPreview";
import { openWhatsAppShare } from "./whatsapp";
import { cn } from "@/lib/utils";

interface ShareAllColorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

function generateColorMessage(product: Product, selectedColors: ProductColor[]) {
  const colorList = selectedColors
    .map((c, i) => `${i + 1}. ${c.name}`)
    .join("\n");

  return `🎨 *CATÁLOGO DE CORES* 🎨

*${product.name}*
SKU: ${product.sku}

${product.description || ""}

📋 *${selectedColors.length} cores selecionadas:*
${colorList}

💰 A partir de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price)}/un
📦 Qtd mínima: ${product.minQuantity} un
${product.stockStatus === "in-stock" ? "✅ Pronta entrega" : "⚠️ Consultar prazo"}

👆 Cada cor acompanha foto ilustrativa.

Brindes Sicoob - Brindes com Excelência!`;
}

function colorThumbnail(color: ProductColor, fallbackImage?: string) {
  return color.image || color.images?.[0] || fallbackImage;
}

function colorImageCount(color: ProductColor) {
  return color.images?.length ?? (color.image ? 1 : 0);
}

function ColorOption({
  color,
  index,
  isSelected,
  fallbackImage,
  onToggle,
}: {
  color: ProductColor;
  index: number;
  isSelected: boolean;
  fallbackImage?: string;
  onToggle: (index: number) => void;
}) {
  const thumbnail = colorThumbnail(color, fallbackImage);
  const imageCount = colorImageCount(color);
  return (
    <button
      type="button"
      onClick={() => onToggle(index)}
      className={cn(
        "flex items-center gap-2 p-1.5 rounded-lg text-left transition-all border",
        isSelected ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" : "bg-secondary/30 border-transparent opacity-60 hover:opacity-100 hover:bg-secondary/60",
      )}
    >
      <div className="relative w-10 h-10 rounded-md overflow-hidden bg-secondary shrink-0">
        <img src={thumbnail} alt={color.name} className="w-full h-full object-cover" loading="lazy" />
        {isSelected && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><Check className="h-4 w-4 text-primary" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border border-border shrink-0" style={{ backgroundColor: color.hex || "#ccc" }} />
          <span className="text-xs font-medium truncate">{color.name}</span>
        </div>
        {imageCount > 0 && <span className="text-[10px] text-muted-foreground">{imageCount} foto{imageCount > 1 ? "s" : ""}</span>}
      </div>
    </button>
  );
}

function groupProductColors(colors: ProductColor[]) {
  const groups = new Map<string, { color: ProductColor; index: number }[]>();
  colors.forEach((color, index) => { const key = color.group || "Outras"; groups.set(key, [...(groups.get(key) ?? []), { color, index }]); });
  return groups;
}

function useColorSelection(product: Product) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set(product.colors.map((_, index) => index)));
  const selectedColors = useMemo(() => product.colors.filter((_, index) => selectedIds.has(index)), [product.colors, selectedIds]);
  const toggle = useCallback((index: number) => setSelectedIds((current) => { const next = new Set(current); if (next.has(index)) { if (next.size > 1) next.delete(index); } else next.add(index); return next; }), []);
  const selectAll = useCallback(() => setSelectedIds(new Set(product.colors.map((_, index) => index))), [product.colors]);
  const deselectAll = useCallback(() => setSelectedIds(new Set([0])), []);
  return { selectedIds, selectedColors, toggle, selectAll, deselectAll, allSelected: selectedIds.size === product.colors.length };
}

function ColorGrid({ product, selection, onRegenerate }: { product: Product; selection: ReturnType<typeof useColorSelection>; onRegenerate: () => void }) {
  const groups = useMemo(() => groupProductColors(product.colors), [product.colors]);
  const selectAll = () => { if (selection.allSelected) selection.deselectAll(); else selection.selectAll(); onRegenerate(); };
  const toggle = (index: number) => { selection.toggle(index); onRegenerate(); };
  return (
    <>
      <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">{selection.selectedIds.size} de {product.colors.length} cores selecionadas</span><button type="button" onClick={selectAll} className="text-xs text-primary hover:underline">{selection.allSelected ? "Desmarcar todas" : "Selecionar todas"}</button></div>
      <ScrollArea className="max-h-[280px]"><div className="space-y-3 pr-2">{Array.from(groups.entries()).map(([groupName, items]) => <div key={groupName}><span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">{groupName}</span><div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">{items.map(({ color, index }) => <ColorOption key={index} color={color} index={index} isSelected={selection.selectedIds.has(index)} fallbackImage={product.images[0]} onToggle={toggle} />)}</div></div>)}</div></ScrollArea>
    </>
  );
}

function ColorMessageEditor({ previewMode, setPreviewMode, message, images, selectedImages, contactName, setMessage }: { previewMode: boolean; setPreviewMode: (value: boolean) => void; message: string; images: string[]; selectedImages: Set<number>; contactName?: string; setMessage: (message: string) => void }) {
  return (
    <><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Mensagem</span><button type="button" onClick={() => setPreviewMode(!previewMode)} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors", previewMode ? "bg-[hsl(153,18%,18%)] text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}>{previewMode ? <><Pencil className="h-3 w-3" />Editar</> : <><Eye className="h-3 w-3" />Preview WhatsApp</>}</button></div>
    <div key={previewMode ? "preview" : "edit"} className="animate-fade-in">{previewMode ? <WhatsAppPreview message={message} images={images} selectedImages={selectedImages} contactName={contactName} /> : <div className="bg-secondary/50 rounded-xl p-3 border border-border"><Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-[140px] bg-transparent border-0 resize-none focus-visible:ring-0 text-sm" /></div>}</div></>
  );
}

function AllColorsBody({ product, selection, message, images, imageIndices, previewMode, setPreviewMode, contact, setContact, setMessage, regenerate, close, send }: { product: Product; selection: ReturnType<typeof useColorSelection>; message: string; images: string[]; imageIndices: Set<number>; previewMode: boolean; setPreviewMode: (value: boolean) => void; contact: ShareContactSelection | null; setContact: (contact: ShareContactSelection | null) => void; setMessage: (message: string) => void; regenerate: () => void; close: () => void; send: () => void }) {
  return (
    <div className="space-y-4">
      <ColorGrid product={product} selection={selection} onRegenerate={regenerate} />
      <ColorMessageEditor previewMode={previewMode} setPreviewMode={setPreviewMode} message={message} images={images} selectedImages={imageIndices} contactName={contact?.contactName} setMessage={setMessage} />
      <div className="space-y-2"><span className="text-xs font-medium text-muted-foreground">Destinatário</span><ShareContactSelector selection={contact} onSelect={setContact} /></div>
      <div className="flex gap-2 pt-1"><Button variant="outline" className="flex-1" onClick={close}>Cancelar</Button><Button className="flex-1 gap-2" onClick={send}><Send className="h-4 w-4" />Enviar {selection.selectedColors.length} cores</Button></div>
    </div>
  );
}

function openColorCatalog(message: string, contact: ShareContactSelection | null) {
  const target = contact?.contactName || contact?.companyName || "destinatário";
  return { ...openWhatsAppShare({ message, phone: contact?.contactPhone }), target };
}

export function ShareAllColorsDialog({ open, onOpenChange, product }: ShareAllColorsDialogProps) {
  const { toast } = useToast();
  const selection = useColorSelection(product);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [contactSelection, setContactSelection] = useState<ShareContactSelection | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const message = customMessage ?? generateColorMessage(product, selection.selectedColors);

  const allColorImages = useMemo(() => selection.selectedColors.map((color) => color.image || color.images?.[0] || product.images[0]).filter(Boolean) as string[], [selection.selectedColors, product.images]);
  const allColorImageIndices = useMemo(() => new Set(allColorImages.map((_, index) => index)), [allColorImages]);

  const handleSend = () => {
    const { opened, target } = openColorCatalog(message, contactSelection);
    if (opened) toast({ title: "WhatsApp aberto", description: `Catálogo de cores preparado para ${target}` });
    else toast({ title: "Não foi possível abrir o WhatsApp", description: "Verifique se popups estão permitidos no navegador.", variant: "destructive" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Enviar Todas as Cores
          </DialogTitle>
          <DialogDescription>Selecione as cores para enviar com fotos individuais ao cliente</DialogDescription>
        </DialogHeader>

        <AllColorsBody product={product} selection={selection} message={message} images={allColorImages} imageIndices={allColorImageIndices} previewMode={previewMode} setPreviewMode={setPreviewMode} contact={contactSelection} setContact={setContactSelection} setMessage={setCustomMessage} regenerate={() => setCustomMessage(null)} close={() => onOpenChange(false)} send={handleSend} />
      </DialogContent>
    </Dialog>
  );
}
