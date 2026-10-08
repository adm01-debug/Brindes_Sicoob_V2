import { useState, useCallback, useMemo, useEffect } from "react";
import { MessageCircle, Send, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/hooks/useProducts";
import { PhotoSelector } from "./PhotoSelector";
import { ShareContactSelector, type ShareContactSelection } from "./ShareContactSelector";
import { MESSAGE_TEMPLATES, type TemplateKey } from "./MessageTemplates";
import { WhatsAppPreview } from "./WhatsAppPreview";
import { openWhatsAppShare } from "./whatsapp";
import { cn } from "@/lib/utils";

interface SelectedVariantInfo {
  variantName?: string | null;
  colorHex?: string | null;
  thumbnailUrl?: string | null;
}

interface SharePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  selectedVariant?: SelectedVariantInfo | null;
}

function ShareDialogHeader({ selectedVariant }: { selectedVariant?: SelectedVariantInfo | null }) {
  return (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-success" />
        Enviar Produto
        {selectedVariant?.variantName && (
          <span className="inline-flex items-center gap-1.5 ml-1">
            {selectedVariant.colorHex && <span className="w-3 h-3 rounded-full border border-border/50 shrink-0" style={{ backgroundColor: selectedVariant.colorHex }} />}
            <span className="text-xs font-normal text-muted-foreground">— {selectedVariant.variantName}</span>
          </span>
        )}
      </DialogTitle>
      <DialogDescription>Selecione fotos, modelo de mensagem e contato</DialogDescription>
    </DialogHeader>
  );
}

function MessageEditor({
  previewMode,
  setPreviewMode,
  message,
  images,
  selectedImages,
  contactName,
  setCustomMessage,
}: {
  previewMode: boolean;
  setPreviewMode: (value: boolean) => void;
  message: string;
  images: string[];
  selectedImages: Set<number>;
  contactName?: string;
  setCustomMessage: (message: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Mensagem</span>
        <button type="button" onClick={() => setPreviewMode(!previewMode)} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors", previewMode ? "bg-[hsl(142,40%,28%)] text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}>
          {previewMode ? <><Pencil className="h-3 w-3" />Editar</> : <><Eye className="h-3 w-3" />Preview WhatsApp</>}
        </button>
      </div>
      <div key={previewMode ? "preview" : "edit"} className="animate-fade-in">
        {previewMode ? (
          <WhatsAppPreview message={message} images={images} selectedImages={selectedImages} contactName={contactName} />
        ) : (
          <div className="bg-secondary/50 rounded-xl p-3 border border-border">
            <Textarea value={message} onChange={(event) => setCustomMessage(event.target.value)} className="min-h-[160px] bg-transparent border-0 resize-none focus-visible:ring-0 text-sm" />
          </div>
        )}
      </div>
    </>
  );
}

function mainProductImages(product: Product, variantThumbnail?: string | null) {
  const preferred = variantThumbnail ? [variantThumbnail] : [];
  if (!product.colors?.length) return Array.from(new Set([...preferred, ...product.images]));
  const colorImages = new Set<string>();
  product.colors.forEach((color) => { if (color.image) colorImages.add(color.image); color.images?.forEach((image) => colorImages.add(image)); });
  const filtered = product.images.filter((image) => !colorImages.has(image));
  preferred.push(...(filtered.length > 0 ? filtered : product.images[0] ? [product.images[0]] : []));
  return Array.from(new Set(preferred));
}

function buildShareMessage(product: Product, templateKey: TemplateKey, variantName?: string | null) {
  const template = MESSAGE_TEMPLATES.find((item) => item.key === templateKey) ?? MESSAGE_TEMPLATES[0];
  const message = template?.generate(product) ?? "";
  return variantName ? `${message}\n\n🎨 Cor/variação: ${variantName}` : message;
}

function openProductShare(message: string, contact: ShareContactSelection | null) {
  const target = contact?.contactName || contact?.companyName || "destinatário";
  return { ...openWhatsAppShare({ message, phone: contact?.contactPhone }), target };
}

function usePhotoSelection(images: string[]) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(images.map((_, index) => index)));
  useEffect(() => setSelected(new Set(images.map((_, index) => index))), [images]);
  const toggle = useCallback((index: number) => setSelected((current) => { const next = new Set(current); if (next.has(index)) { if (next.size > 1) next.delete(index); } else next.add(index); return next; }), []);
  const selectAll = useCallback(() => setSelected(new Set(images.map((_, index) => index))), [images]);
  const deselectAll = useCallback(() => setSelected(new Set([0])), []);
  return { selected, toggle, selectAll, deselectAll };
}

function TemplateSelector({ active, onChange }: { active: TemplateKey; onChange: (key: TemplateKey) => void }) {
  return <div className="space-y-2"><span className="text-xs font-medium text-muted-foreground">Modelo de mensagem</span><div className="flex gap-1.5">{MESSAGE_TEMPLATES.map((template) => <button key={template.key} type="button" onClick={() => onChange(template.key)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors", active === template.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")} title={template.description}>{template.label}</button>)}</div></div>;
}

interface ShareDialogBodyProps {
  images: string[];
  photos: ReturnType<typeof usePhotoSelection>;
  activeTemplate: TemplateKey;
  onTemplateChange: (key: TemplateKey) => void;
  previewMode: boolean;
  setPreviewMode: (value: boolean) => void;
  message: string;
  contactSelection: ShareContactSelection | null;
  setContactSelection: (selection: ShareContactSelection | null) => void;
  setCustomMessage: (message: string) => void;
  close: () => void;
  send: () => void;
}

function ShareDialogBody({ images, photos, activeTemplate, onTemplateChange, previewMode, setPreviewMode, message, contactSelection, setContactSelection, setCustomMessage, close, send }: ShareDialogBodyProps) {
  return (
    <div className="space-y-4">
      <PhotoSelector images={images} selectedImages={photos.selected} onToggle={photos.toggle} onSelectAll={photos.selectAll} onDeselectAll={photos.deselectAll} />
      <TemplateSelector active={activeTemplate} onChange={onTemplateChange} />
      <MessageEditor previewMode={previewMode} setPreviewMode={setPreviewMode} message={message} images={images} selectedImages={photos.selected} contactName={contactSelection?.contactName} setCustomMessage={setCustomMessage} />
      <div className="space-y-2"><span className="text-xs font-medium text-muted-foreground">Destinatário</span><ShareContactSelector selection={contactSelection} onSelect={setContactSelection} /></div>
      <div className="flex gap-2 pt-1"><Button variant="outline" className="flex-1" onClick={close}>Cancelar</Button><Button className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={send}><Send className="h-4 w-4" />Enviar - WhatsApp</Button></div>
    </div>
  );
}

export function SharePreviewDialog({ open, onOpenChange, product, selectedVariant }: SharePreviewDialogProps) {
  const { toast } = useToast();
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey>("informal");
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [contactSelection, setContactSelection] = useState<ShareContactSelection | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const mainImages = useMemo(() => mainProductImages(product, selectedVariant?.thumbnailUrl), [product, selectedVariant?.thumbnailUrl]);
  const photos = usePhotoSelection(mainImages);

  const defaultMessage = useMemo(() => buildShareMessage(product, activeTemplate, selectedVariant?.variantName), [activeTemplate, product, selectedVariant?.variantName]);
  const message = customMessage ?? defaultMessage;

  const handleTemplateChange = (key: TemplateKey) => { setActiveTemplate(key); setCustomMessage(null); };

  const handleSend = () => {
    const { opened, target } = openProductShare(message, contactSelection);
    if (opened) toast({ title: "WhatsApp aberto", description: `Mensagem preparada para ${target}` });
    else toast({ title: "Não foi possível abrir o WhatsApp", description: "Verifique se popups estão permitidos no navegador.", variant: "destructive" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[64vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <ShareDialogHeader selectedVariant={selectedVariant} />

        <ShareDialogBody images={mainImages} photos={photos} activeTemplate={activeTemplate} onTemplateChange={handleTemplateChange} previewMode={previewMode} setPreviewMode={setPreviewMode} message={message} contactSelection={contactSelection} setContactSelection={setContactSelection} setCustomMessage={setCustomMessage} close={() => onOpenChange(false)} send={handleSend} />
      </DialogContent>
    </Dialog>
  );
}
